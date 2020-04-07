const admZip = require('adm-zip');
const fs = require('fs');
const filesize = require("filesize");
const db = require('./db');
const util = require('util');
const sanitizeHtml = require('sanitize-html');
const request = require('request');

const books = require('./booksList');
const authors = require('./authors');

const books_path = `generated_books/`;
const images_path = `img/`;
const chapters_path = `chapters/`;
const book_file = `book.json`;
const book_extra_files = `files/`;
const book_zip_file = `book.zip`;

exports.jsonBook = async function jsonBook(bookId, full = true) {
  const book = {};
  const list = await books.get(bookId);
  const info = list[0];
  const author = await authors.getAuthors(bookId);

  author.forEach(auth => { auth.pictureName = auth.pictureName !== null ? `${bookId}_author_${auth.pictureName}` : null });

  //add author pictures
  var imagesToDownload = author
    .map(auth => {
      return auth.pictureName != null ? { "name": auth.pictureName, "url": auth.pictureUrl } : null;
    })
    .filter(el => el != null);

  //        `SELECT chapter_id, book_id, short_name, title, order_number, section_header, show_number, show_pdf, last_updated, copyright_override, published, synchronize, IF(pw="",0,1) AS pw_exists, IF(editor_notes="",0,1) AS editor_notes_exist  FROM chapters WHERE book_id = ? '`
  const q = `SELECT chapter_id, book_id, short_name, title, order_number, section_header, show_number, show_headings, last_updated, copyright_override, published, synchronize, parent_id, language_id, text_processed, citation, section_headers
  FROM chapters WHERE book_id = ${bookId} AND published = 1 ORDER BY order_number ASC, section_header DESC, title ASC`;

  const chaptersRows = await db.query(q);

  if (chaptersRows.length == 0 && info == undefined) {
    throw "Book not found";
  }

  var i = 0;
  var sectionHeaderStarted = false;
  book["info"] = info;
  book["authors"] = author;
  book["chapters"] = await Promise.all(chaptersRows.map(async row => {
    let chapter = {}
    let imagesAndText = await sanitizeText(row.text_processed, bookId);
    let text = imagesAndText.text;

    //add images from chapters
    imagesToDownload = imagesToDownload.concat(imagesAndText.images)

    var show_headings = row.show_headings;
    if (row.section_header == 1) { sectionHeaderStarted = true; }
    if (row.section_header != 1 && sectionHeaderStarted) { show_headings = 1 }

    //save text to html
    let fileName = `${row.chapter_id}.html`;
    let chapterPath = `${books_path}/${bookId}/${chapters_path}/${fileName}`
    await writeChapter(chapterPath, text)

    chapter["id"] = row.chapter_id;
    chapter["bookId"] = row.book_id;
    chapter["fileName"] = fileName;
    chapter["shortName"] = row.short_name;
    chapter["title"] = row.title;
    chapter["orderNumber"] = row.order_number;
    chapter["isSectionHeader"] = Boolean(row.section_header);
    chapter["showNumber"] = Boolean(row.show_number);
    chapter["showHeadings"] = Boolean(show_headings);
    chapter["lastUpdated"] = row.last_updated;
    chapter["parentId"] = row.synchronize == 1 ? row.parent_id : null;
    chapter["copyrightOverride"] = row.copyright_override === "" ? null : row.copyright_override;
    chapter["language"] = row.language_id;
    chapter["citation"] = row.citation;

    return chapter;
  }));

  if (full) {
    //filter images
    imagesToDownload = imagesToDownload.filter((obj, pos, arr) => {
      return arr.map(i => `${i.name}-${i.url}`).indexOf(`${obj.name}-${obj.url}`) === pos;
    });
    //download
    for (let img of imagesToDownload) {
      await downloadImage(img.url, `${books_path}/${bookId}/${images_path}/${img.name}`);
    }
  }

  return book;
}

async function sanitizeText(text, bookId) {
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
      },
      'div': function (tagName, attribs) {
        if (attribs.class == 'youtube-container' && attribs['data-src'] != null) {
          let link = attribs['data-src'];
          // Object.assign(attribs, { "href": link, "style": "display:block" })
          Object.assign(attribs, {"onclick":`javascript:window.open('${link}')`, "style":"cursor:pointer;-webkit-touch-callout: none;"})
          delete attribs['data-src'];
          // delete attribs['data-toggle'];
          // return { tagName: "a", attribs: attribs };
        }
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
    fs.writeFileSync(filename, result.body, 'binary');
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

exports.generateBook = async function generateBook(bookId) {
  let path = `${books_path}${bookId}/`;
  fs.mkdirSync(path, { recursive: true });
  fs.mkdirSync(`${path}${images_path}`, { recursive: true });
  fs.mkdirSync(`${path}${chapters_path}`, { recursive: true });

  let book = await this.jsonBook(bookId);
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
