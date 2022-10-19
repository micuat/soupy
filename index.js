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
        exec(`cp ${ process.env.TEMP_DIR }/${ id }_000.png ${ process.env.TARGET_DIR }/${ id }_thumb.png`, (err, stdout, stderr) => {
          if (err) {
            // node couldn't execute the command
            console.log("file copy failed");
            return;
          }
        });
        exec(`ffmpeg -y -r 2 -i ${ process.env.TEMP_DIR }/${ id }_%03d.png ${ webm }`, (err, stdout, stderr) => {
          if (err) {
            // node couldn't execute the command
            console.log("ffmpeg failed");
            return;
          }
          console.log(`saved to ${ webm }`);
        });
        // break;
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
  let hueShift;
  let img;
  p.setup = () => {
    canvas = p.createCanvas(300, 300);
    p.noLoop();
    p.finished = false;
  }
  p.init = async () => {
    await p.loadImage(p.soup.url).then(async (loadedImg) => {
      img = loadedImg;
      hueShift = p.hue(img.get(img.width/2, img.height/2)) + 0.35;
    })
  }
  function RGBtoHSV(r, g, b) {
    if (arguments.length === 1) {
        g = r.g, b = r.b, r = r.r;
    }
    var max = Math.max(r, g, b), min = Math.min(r, g, b),
        d = max - min,
        h,
        s = (max === 0 ? 0 : d / max),
        v = max / 255;

    switch (max) {
        case min: h = 0; break;
        case r: h = (g - b) + d * (g < b ? 6: 0); h /= 6 * d; break;
        case g: h = (b - r) + d * 2; h /= 6 * d; break;
        case b: h = (r - g) + d * 4; h /= 6 * d; break;
    }

    return {
        h: h,
        s: s,
        v: v
    };
  }
  
  function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
  }

  p.draw = async () => {
    if (p.soup !== undefined) {
      //src(s0).mult(osc(2,1).kaleid().blend(osc(2,1),1).color(1,-1,1).hue(.1)).out()
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
        let x = (i / 4) % p.width / p.width;
        let offset = 0;
        let frequency = 2;
        let time = curFrame / 10;
        let sync = Math.PI * 1;
        let or = Math.sin((x-offset/frequency+time*sync)*frequency)*0.5  + 0.5;
        let og = Math.sin((x+time*sync)*frequency)*0.5 + 0.5;
        let ob = Math.sin((x+offset/frequency+time*sync)*frequency)*0.5  + 0.5;

        let sr = or * 1;
        let sg = (og * -1 + 2) % 1;
        let sb = ob * 0;
        
        let hsv = RGBtoHSV(sr * 255, sg * 255, sb * 255);
        hsv.h = (hsv.h + hueShift) % 1;
        let rgb = HSVtoRGB(hsv);
        p.pixels[i + 0] *= rgb.r / 255;
        p.pixels[i + 1] *= rgb.g / 255;
        p.pixels[i + 2] *= rgb.b / 255;
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
