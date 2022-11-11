require('dotenv').config();
const fetch = require("node-fetch");
const fs = require('fs');
const { exec } = require('child_process');

const AirtableLoader = require("./airtable_loader.js");
const airtableLoader = new AirtableLoader(process.env.AIRTABLE_API_KEY, process.env.AIRTABLE_BASENAME);

const dataPath = `${ process.env.TARGET_DIR }/data.json`;
const lastData = loadData(); //TODO fix

function loadData() {
  try {
    const dataString = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(dataString);
  } catch (e) {
    console.log("no existing data found")
    return [];
  }
}

{
  const out = [];
  airtableLoader.load(
    // every
    (r) => {
      for (const el of r) {
        if (el.image !== "") {
          el.image_url = `/generated/${ el.id }_org.png`;
          out.push(el);
        }
      }
    },
    // done
    async () => {
      for (const el of out) {
        const url = el.image;
        const id = el.id;
        console.log(url)

        const forceUpdate = false;

        const lastEl = lastData.find(e => e.id === el.id);

        let doUpdate = false;
        if (forceUpdate) {
          doUpdate = true;
        }
        if (lastEl === undefined) {
          doUpdate = true;
        }
        if (el["last image modified"] !== lastEl["last image modified"]) {
          doUpdate = true;
        }
        if (doUpdate === false) {
          console.log(`skipping ${ id }: ${ el.name }`);
          continue;
        }

        const webm = `${ process.env.TARGET_DIR }/${ id }.webm`;

        console.log(el.id, el.name);
        for (const s of [sketch, orgSaveSketch]) {
          let p5Instance = p5.createSketch(s);
          p5Instance.soup = { url, id };
          await p5Instance.init();
          while (p5Instance.finished === false) {
            await p5Instance.draw();
          }
        }
        
        exec(`cp ${ process.env.TEMP_DIR }/${ id }_glitch_000.png ${ process.env.TARGET_DIR }/${ id }_thumb.png`, (err, stdout, stderr) => {
        // exec(`cp ${ process.env.TEMP_DIR }/${ id }_000.png ${ process.env.TARGET_DIR }/${ id }_thumb.png`, (err, stdout, stderr) => {
          if (err) {
            // node couldn't execute the command
            console.log("file copy 1 failed");
            return;
          }
        });
        exec(`cp ${ process.env.TEMP_DIR }/${ id }_org.png ${ process.env.TARGET_DIR }/${ id }_org.png`, (err, stdout, stderr) => {
          if (err) {
            // node couldn't execute the command
            console.log("file copy 2 failed");
            return;
          }
        });
        // exec(`ffmpeg -y -r 2 -i ${ process.env.TEMP_DIR }/${ id }_%03d.png ${ webm }`, (err, stdout, stderr) => {
        //   if (err) {
        //     // node couldn't execute the command
        //     console.log("ffmpeg failed");
        //     return;
        //   }
        //   console.log(`saved to ${ webm }`);
        // });
        // break;
      }
      function saveCurrentData() {
        const jsonFileStream = fs.createWriteStream(dataPath);
        jsonFileStream.write(JSON.stringify(out));
        jsonFileStream.end();
      }
      saveCurrentData();
    }
  );
}

const p5 = require('node-p5');

function sketchHydra(p) {
  let canvas;
  let curFrame = 0;
  const frames = 1;
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
      hueShift = p.hue(img.get(img.width/2, img.height/2)) / 255;
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

function sketch(p) {
  let canvas;
  let img;
  let pg;
  let curFrame = 0;
  const frames = 1;
  
  const a = 100*100*4;
  const b = 300*300*4-256;
  const d = 100;
  p.setup = () => {
    canvas = p.createCanvas(300, 300);
    p.noLoop();
    p.pixelDensity(1);
    p.finished = false;
  };

  p.init = async () => {
    await p.loadImage(p.soup.url).then(async (loadedImg) => {
      img = loadedImg;
      pg = p.createGraphics(p.width, p.height);
      pg.pixelDensity(1);
      pg.background(0, 0, 0, 255);
      pg.push();
  
      if (img.width > img.height) {
        pg.translate(pg.width / 2, 0);
        pg.scale(pg.height / img.height);
        pg.image(img, -img.width / 2, 0)
      }
      else {
        pg.translate(0, pg.height / 2);
        pg.scale(pg.width / img.width);
        pg.image(img, 0, -img.height / 2)
      }
      pg.pop();
    })
  }
 
  p.draw = async () => {
    if (p.soup !== undefined) {
      const w = p.width;
      pg.loadPixels();
      let pixels = pg.pixels;
      for (let x = 1; x < w * w * 4; x += w*2) {
        pixels[x] *= (x/4) % w < d ? 0.5 : 2;
        pixels.copyWithin(x - pixels[a*2] - pixels[a] * 2, x + pixels[a], x + w-1);
      }
      pixels.copyWithin(b-8e3, 1, 8e3);
      pixels.reverse();
      pg.updatePixels();
      
      p.push();
      p.translate(p.width/2, p.height/2);
      p.rotate(Math.PI)
      p.translate(-p.width/2, -p.height/2);
      p.image(pg, 0, 0);
      p.pop();

      await p.saveCanvas(canvas, `${ process.env.TEMP_DIR }/${ p.soup.id }_glitch_${ p.nf(curFrame, 3, 0) }`, 'png').then(filename => {
        console.log(`saved the canvas as ${filename}`);
        curFrame++;
        p.finished = curFrame >= frames;
      });
    }

  };
};

function orgSaveSketch(p) {
  let canvas;
  let img;
  let pg;
  let curFrame = 0;
  const frames = 1;
  
  p.setup = () => {
    canvas = p.createCanvas(800, 800);
    p.noLoop();
    p.pixelDensity(1);
    p.finished = false;
  };

  p.init = async () => {
    await p.loadImage(p.soup.url).then(async (loadedImg) => {
      img = loadedImg;
      pg = p.createGraphics(p.width, p.height);
      pg.pixelDensity(1);
      pg.background(0, 0, 0, 255);
      pg.push();
  
      if (img.width > img.height) {
        pg.translate(pg.width / 2, 0);
        pg.scale(pg.height / img.height);
        pg.image(img, -img.width / 2, 0)
      }
      else {
        pg.translate(0, pg.height / 2);
        pg.scale(pg.width / img.width);
        pg.image(img, 0, -img.height / 2)
      }
      pg.pop();
    })
  }
 
  p.draw = async () => {
    if (p.soup !== undefined) {
      p.push();
      p.image(pg, 0, 0);
      p.pop();

      await p.saveCanvas(canvas, `${ process.env.TEMP_DIR }/${ p.soup.id }_org`, 'png').then(filename => {
        console.log(`saved the canvas as ${filename}`);
        curFrame++;
        p.finished = curFrame >= frames;
      });
    }

  };
};
