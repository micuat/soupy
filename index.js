require('dotenv').config();
const fetch = require("node-fetch");
// const express = require("express");
// const app = express();
const fs = require('fs');
const { exec } = require('child_process');
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
    async () => {
      // console.log(out);

      for (const el of out) {
        const url = el.image;
        const id = el.id;
        console.log(url)
        await fetch(url)
          .then(async function (res, reject) {
            // handle the response
            // const file = fs.createWriteStream(`${process.env.TARGET_DIR}/${id}`);
            // res.body.pipe(file);
            // res.body.on("error", reject);
            // file.on("finish", res);
            console.log(el.id, el.name);
            let p5Instance = p5.createSketch(sketch);
            p5Instance.soup = { url, id };
            await p5Instance.init();
            while (p5Instance.finished === false) {
              await p5Instance.draw();
            }
          })
          .catch(function (err) {
            // handle the error
          });
        
        const webm = `${ process.env.TARGET_DIR }/${ id }.webm`;
        exec(`ffmpeg -y -r 2 -i ${ process.env.TEMP_DIR }/${ id }_%03d.png ${ webm }`, (err, stdout, stderr) => {
          if (err) {
            // node couldn't execute the command
            console.log("ffmpeg failed");
            return;
          }
          console.log(`saved to ${ webm }`);
        });
        break;
      }
    }
  );
}

const p5 = require('node-p5');

function sketch(p) {
  let canvas;
  let curFrame = 0;
  const frames = 10;
  const mode = Math.floor(Math.random() * 4)
  let img;
  p.setup = () => {
    canvas = p.createCanvas(300, 300);
    p.noLoop();
    p.finished = false;
  }
  p.init = async () => {
    await p.loadImage(p.soup.url).then(async (loadedImg) => {
      img = loadedImg;
    })
  }
  p.draw = async () => {
    if (p.soup !== undefined) {
      let sr, sg, sb;
      function setTint(r, g, b) {
        sr = r;
        sg = g;
        sb = b;
      }
      switch(mode) {
        case 0:
          setTint(255, 0, 50 * (Math.abs(5 - curFrame)));
          break;
        case 1:
          setTint(255, 50 * (Math.abs(5 - curFrame)), 0);
          break;
        // case 2:
        //   p.tint(0, 255, 50 * (Math.abs(5 - curFrame)));
        //   break;
        // case 3:
        //   p.tint(50 * (Math.abs(5 - curFrame)), 255, 0);
        //   break;
        case 2:
          setTint(0, 50 * (Math.abs(5 - curFrame)), 255);
          break;
        case 3:
          setTint(50 * (Math.abs(5 - curFrame)), 0, 255);
          break;
      }

      p.push();

      if (img.width > img.height) {
        p.translate(p.width / 2, 0);
        p.scale(p.height / img.height);
        p.image(img, -img.width / 2, 0)
      }
      else {
        p.translate(0, p.height / 2);
        p.scale(p.width / img.width);
        p.image(img, 0, -img.height / 2)
      }

      p.loadPixels();
      for(let i = 0; i < p.pixels.length; i+=4) {
        p.pixels[i + 0] *= sr / 255;
        p.pixels[i + 1] *= sg / 255;
        p.pixels[i + 2] *= sb / 255;
      }
      p.updatePixels();

      p.pop();

      await p.saveCanvas(canvas, `${ process.env.TEMP_DIR }/${ p.soup.id }_${ p.nf(curFrame, 3, 0) }`, 'png').then(filename => {
        console.log(`saved the canvas as ${filename}`);
        curFrame++;
        p.finished = curFrame >= frames;
      });
    }
  }
}
