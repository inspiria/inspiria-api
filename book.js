const admZip = require('adm-zip');
const fs = require('fs');
const db = require('./db');
const books = require('./booksList');
const util = require('util');
const sanitizeHtml = require('sanitize-html');
const request = require('request');

exports.jsonBook = async function jsonBook(bookId, full = true) {
  const book = {};
  const list = await books.get(bookId);
  const info = list[0];
  
  //        `SELECT chapter_id, book_id, short_name, title, order_number, section_header, show_number, show_pdf, last_updated, copyright_override, published, synchronize, IF(pw="",0,1) AS pw_exists, IF(editor_notes="",0,1) AS editor_notes_exist  FROM chapters WHERE book_id = ? '`
  const q = `SELECT chapter_id, book_id, short_name, title, order_number, section_header, show_number, show_headings, last_updated, copyright_override, published, synchronize, parent_id, language_id, text_processed, citation, section_headers
  FROM chapters WHERE book_id = ${bookId} AND published = 1 ORDER BY order_number ASC, section_header DESC, title ASC`;

  const chaptersRows = await db.query(q);

  if (chaptersRows.length == 0 && info == undefined) {
    throw "Book not found";
  }

  var i = 0;
  book["info"] = info;
  book["chapters"] = await Promise.all(chaptersRows.map(async row => {
    let chapter = {}
    let text = await sanitizeText(row.text_processed, bookId, full);

    chapter["id"]                = row.chapter_id;
    chapter["bookId"]            = row.book_id;
    chapter["shortName"]         = row.short_name;
    chapter["title"]             = row.title;
    chapter["orderNumber"]       = row.order_number;
    chapter["isSectionHeader"]   = Boolean(row.section_header);
    chapter["showNumber"]        = Boolean(row.show_number);
    chapter["showHeadings"]      = Boolean(row.show_headings);
    chapter["lastUpdated"]       = row.last_updated;
    chapter["parentId"]          = row.synchronize == 1 ? row.parent_id : null;
    chapter["copyrightOverride"] = row.copyright_override === "" ? null : row.copyright_override;
    chapter["language"]          = row.language_id;
    chapter["citation"]          = full ? row.citation        : (row.citation        == null ? null : "citation goes here");
    chapter["text"]              = full ? text                : (text                == null ? null : "text goes here");
    chapter["sectionHeaders"]    = full ? row.section_headers : (row.section_headers == null ? null : "section_headers goes here");
    
    if (full == false && i == 5) {
      // chapter["text"] = row.text_processed;
      chapter["tt"] = text;
    }

    i++;

    return chapter;
  }));

  return book;
}

async function sanitizeText(text, bookId, download) {
  var images = [];
  const sanitizeOptions = {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img' ]),
    transformTags: {
      'img': function(tagName, attribs) {
        let url = attribs.src;
        var name = url.split('/').pop();
        images.push({"name":name, "url":url})
        return {
          tagName: tagName,
          attribs: { src: name }
        };
      }
    }
  };

  let result = sanitizeHtml(text, sanitizeOptions)
  if (download) {
    for (let img of images) {
      await downloadImage(img.url, `./tmp/${bookId}/img/${img.name}`);
    }
  }

  return result
}

async function downloadImage(uri, filename) {
  const requestSync = util.promisify(request);
  let result = await requestSync(uri, {encoding: 'binary'});
  if (result.statusCode == 200) {
    fs.writeFileSync(filename, result.body, 'binary');
  }
}

async function exportBook(book, path) {
  let data = JSON.stringify(book);
  let filePath = `${path}/book.json`;
  let imagesPath = `${path}/img`;
  let zipPath = `${path}/book.zip`;

  fs.mkdirSync(path, { recursive: true });
  fs.writeFileSync(filePath, data);

  var zip = new admZip();
  zip.addLocalFile(filePath)
  zip.addLocalFolder(imagesPath)
  let writeZip = util.promisify(zip.writeZip).bind(zip)
  await writeZip(zipPath);

  return zipPath;
}

exports.get = async function get(bookId) {
  let path = `./tmp/${bookId}`;
  fs.mkdirSync(path, { recursive: true });
  fs.mkdirSync(`${path}/img`, { recursive: true });

  let book = await this.jsonBook(bookId);
  let result = await exportBook(book, path);
  return result;
}
