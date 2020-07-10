const admZip = require('adm-zip');
const fs = require('fs');
const filesize = require("filesize");
const util = require('util');
const sanitizeHtml = require('sanitize-html');
const request = require('request');

const books_path = `generated_books/`;
const images_path = `img/`;
const chapters_path = `chapters/`;
const book_file = `book.json`;
const book_extra_files = `files/`;
const book_zip_file = `book.zip`;

exports.jsonBook = async function jsonBook(book_info, full = true) {
  const requestSync = util.promisify(request);
  let result = await requestSync(`https://edtechbooks.org/api.php?book=${book_info.shortName}`);
  if (result.statusCode !== 200) { throw "Failed to connect to edtechbooks.org API" }
  var data = JSON.parse(result.body)["book"];

  const book = {};
  const authors = Object.values(data.authors).concat(Object.values(data.shadow_authors));
  const chapters = Object.values(data.chapter_briefs);

  book.authors = authors.map(auth => {
    const author = {};
    author.id           = auth.author_id;
    author.name         = auth.name;
    author.nameSortable = auth.name_sortable;
    author.degree       = auth.degree;
    author.affiliation  = auth.affiliation;
    author.pictureUrl   = auth.bio_pic !== null ? `https://edtechbooks.org/author_images/${auth.bio_pic}` : null;
    author.pictureName  = auth.bio_pic !== null ? `${book_info.shortName}_author_${auth.bio_pic}` : null;
    author.bio          = auth.bio;
    return author;
  });

  //add author pictures
  var imagesToDownload = book.authors.map(auth => {
    return auth.pictureName != null ? { "name": auth.pictureName, "url": auth.pictureUrl } : null;
  })
  .filter(el => el != null);

  
  var i = 0;
  // var sectionHeaderStarted = false;
  book.info = book_info;
  book.chapters = await Promise.all(chapters.map(async row => {
    let result = await requestSync(`https://edtechbooks.org/api.php?book=${book_info.shortName}&chapter=${row.short_name}`);
    if (result.statusCode !== 200) { return null };
    let rowData = JSON.parse(result.body)["chapter"];
    let chapter = {}
    let imagesAndText = await sanitizeText(rowData.text_processed);
    let text = imagesAndText.text;

    //add images from chapters
    imagesToDownload = imagesToDownload.concat(imagesAndText.images)

    //save text to html
    let fileName = `${row.chapter_id}.html`;
    let chapterPath = `${books_path}/${book_info.id}/${chapters_path}/${fileName}`
    await writeChapter(chapterPath, text)

    // var show_headings = row.show_headings;
    // if (row.section_header == 1) { sectionHeaderStarted = true; }
    // if (row.section_header != 1 && sectionHeaderStarted) { show_headings = 1 }

    chapter.id = row.chapter_id;
    chapter.bookId = row.book_id;
    chapter.fileName = fileName;
    chapter.shortName = row.short_name;
    chapter.title = row.title;
    chapter.orderNumber = row.order_number;
    chapter.isSectionHeader = false;//Boolean(row.section_header);
    chapter.showNumber = false;//Boolean(row.show_number);
    chapter.showHeadings = false;//Boolean(show_headings);
    chapter.lastUpdated = row.last_updated;
    chapter.parentId = parseInt(rowData.parent_id);
    chapter.copyrightOverride = null;//row.copyright_override === "" ? null : row.copyright_override;
    chapter.language = row.language_id;
    chapter.citation = row.citation;

    return chapter;
  }));

  if (full) {
    //filter images
    imagesToDownload = imagesToDownload.filter((obj, pos, arr) => {
      return arr.map(i => `${i.name}-${i.url}`).indexOf(`${obj.name}-${obj.url}`) === pos;
    });
    //download
    for (let img of imagesToDownload) {
      await downloadImage(img.url, `${books_path}/${book_info.id}/${images_path}/${img.name}`);
    }
  }

  return book;
}

async function sanitizeText(text) {
  var images = [];

  const sanitizeOptions = {
    allowedTags: false,
    allowedClasses: false,
    allowedAttributes: false,
    transformTags: {
      'img': function (tagName, attribs) {
        let url = attribs.src;
        var name = unescape(new URL(url).pathname.split('/').pop());
        let youtubeId = attribs[`youtube-id`]
        if (youtubeId != null) {
          name = `${youtubeId}-${name}`
        }
        images.push({ "name": name, "url": url })
        let att = Object.assign({}, attribs, { src: name, style: "max-width: 90%;" })
        return { tagName: tagName, attribs: att };
      },
      'table': function (tagName, attribs) {
        var style = 'width: 100%; display: block;overflow: scroll; ';
        if (attribs.style != null) {
          style = style + attribs.style;
        }
        attribs.style = style
        return { tagName: tagName, attribs: attribs };
      }
    }
  };

  let result = sanitizeHtml(text, sanitizeOptions)
  return { "text": result, "images": images }
}

async function writeChapter(uri, content) {
  let header = fs.readFileSync(`${book_extra_files}_header.html`, `utf8`);
  let footer = fs.readFileSync(`${book_extra_files}_footer.html`, `utf8`);
  let data = header + content + footer
  fs.writeFileSync(uri, data, 'utf8');
}

async function downloadImage(uri, filename) {
  const requestSync = util.promisify(request);
  let result = await requestSync(uri, { encoding: 'binary' });
  if (result.statusCode == 200) {
    try {
      fs.writeFileSync(filename, result.body, 'binary');
    } catch (e) {
      console.log(e);
    }
  }
}

async function exportBook(book, path) {
  let data = JSON.stringify(book);
  let filePath = `${path}${book_file}`;
  let imagesPath = `${path}${images_path}`;
  let chaptersPath = `${path}${chapters_path}`;
  let zipPath = `${path}${book_zip_file}`;
  let filesPath = `${book_extra_files}`;

  fs.writeFileSync(filePath, data);

  var zip = new admZip();
  zip.addLocalFile(filePath)
  zip.addLocalFolder(filesPath)
  zip.addLocalFolder(imagesPath)
  zip.addLocalFolder(chaptersPath)

  let writeZip = util.promisify(zip.writeZip).bind(zip)
  await writeZip(zipPath);

  return zipPath;
}

exports.generateBook = async function generateBook(book_info) {
  let path = `${books_path}${book_info.id}/`;
  fs.mkdirSync(path, { recursive: true });
  fs.mkdirSync(`${path}${images_path}`, { recursive: true });
  fs.mkdirSync(`${path}${chapters_path}`, { recursive: true });

  let book = await this.jsonBook(book_info);
  let result = await exportBook(book, path);
  return result;
}

exports.getBook = function getBook(bookId) {
  let path = `${books_path}${bookId}/${book_zip_file}`;
  return path;
}

exports.getBookStatus = function getBookStatus(bookId) {
  let path = `${books_path}${bookId}/${book_zip_file}`;
  try {
    let info = fs.statSync(path)
    return {
      "size": filesize(info.size, { round: 0 }),
      "updated": info.mtime.toLocaleString(),
    }
  } catch (e) {
    return { "error: ": e.toString() }
  }
}
