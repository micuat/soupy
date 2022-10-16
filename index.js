require('dotenv').config();
const fetch = require("node-fetch");
// const express = require("express");
// const app = express();
const fs = require('fs');
// let server;
// if (process.env.HTTP == 1) {
//   server = require("http").createServer(app);
// }
// else {
//   const https = require('https');
//   const options = {
//     key: fs.readFileSync('/opt/certs/privkey.pem'),
//     cert: fs.readFileSync('/opt/certs/cert.pem')
//   };
//   server = https.createServer(options, app)
// }
// const port = process.env.PORT || 3000;

// const requestIp = require('request-ip');

// init sqlite db
const dbFile = "./.data/sqliteImg.db";
const exists = fs.existsSync(dbFile);
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(dbFile);

db.serialize(() => {
  if (!exists) {
    db.run(
      "CREATE TABLE Logs (id INTEGER PRIMARY KEY AUTOINCREMENT, json TEXT)"
    );
  }
});

// server.listen(port, () => {
//   console.log(`listening at port ${port}!`);
// });

// app.use(requestIp.mw())

// app.use("/ip", function (req, res) {
//   const ip = req.clientIp;
//   res.end(ip);
// });

// app.set('trust proxy', true);
// app.use(express.static("public"));

const AirtableLoader = require("./airtable_loader.js");
const airtableLoader = new AirtableLoader(process.env.AIRTABLE_API_KEY, process.env.AIRTABLE_BASENAME);

{
  const out = [];
  airtableLoader.load(
    // every
    (r) => {
      for (const el of r) {
        if (el.image !== "") {
          out.push(el);
        }
      }
    },
    // done
    () => {
      // console.log(out);

      const url = out[0].image;
      const id = out[0].id;
      console.log(url)
      fetch(url)
        .then(function (res, reject) {
          // handle the response
          const file = fs.createWriteStream(`${process.env.TARGET_DIR}/${id}`);
          res.body.pipe(file);
          res.body.on("error", reject);
          file.on("finish", res);
        })
        .catch(function (err) {
          // handle the error
        });
    }
  );
}

const p5 = require('node-p5');

function sketch(p) {
  let canvas;
  p.setup = () => {
    canvas = p.createCanvas(200, 200);
    p.noLoop();
  }
  p.draw = () => {
    p.background(50);
    p.text('hello world!', 50, 100);
    p.saveCanvas(canvas, `${ process.env.TARGET_DIR }/${ "test" }`, 'png').then(filename => {
      console.log(`saved the canvas as ${filename}`);
    });
  }
}

let p5Instance = p5.createSketch(sketch);
