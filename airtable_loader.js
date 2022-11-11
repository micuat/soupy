const Airtable = require('airtable');
module.exports = class AirtableLoader {
  constructor(key, baseName) {
    this.elements = [];
    this.base = new Airtable({ apiKey: key }).base(baseName);
  }
  load(loadCallback, doneCallback) {
    this.base("Table 1")
    .select({
      pageSize: 100,
      view: "Gallery",
    })
    .eachPage(
      (records, fetchNextPage) => {
        const r = records.map((e) => {
          const el = {};
          el.id = e.id;
          for (const key of Object.keys(e.fields)) {
            el[key.toLocaleLowerCase()] = e.fields[key] === undefined ? "" : e.fields[key];
          }
          el.image = "";
          if (e.fields.Attachments) {
            for (let i = 0; i < e.fields.Attachments.length; i++) {
              el.image = e.fields.Attachments[i].url;
              if (e.fields.Attachments[i].thumbnails !== undefined) {
                if (e.fields.Attachments[i].thumbnails.large) {
                  el.image = e.fields.Attachments[i].thumbnails.large.url;
                  break;
                }
              }
            }
          }
          return el;
        });
        this.elements.push(...r);
        if (loadCallback !== undefined) {
          loadCallback(r);
        }

        fetchNextPage();
      },
      (err) => {
        if (doneCallback !== undefined) {
          doneCallback();
        }
        if (err) {
          console.error(err);
          return;
        }
      }
    );
  }
}
