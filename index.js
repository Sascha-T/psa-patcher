const { globSync } = require("glob");
const fs = require("fs")

const root = "C:\\AWRoot\\dtrd\\tree"
let processed = []

function processFile(fileName) {
    if(fs.existsSync(root + "\\" + fileName + ".bak")) {
        processed.push(fileName);
        console.log(`${fileName} already processed.`)
        return;
    }
    let data = fs.readFileSync(root + "\\" + fileName, "utf8")
    if(!data.includes("TestInternet")) {
        console.log(`${fileName} requires no processing.`)
        return;
    }

    fs.copyFileSync(root + "\\" + fileName, root + "\\" + fileName + ".bak")

    data = data.replace(/chk="\d*"\x20/g, "");

    let lines = data.split("\r\n");
    
    let tests = []
    let acts = []

    for(let i = 0; i < lines.length; i++) {

        // detect all test internets
        let line = lines[i];
        if(line.startsWith("<TestInternet")) {
            for(let x = i; x >= 0; x--) {

                let line2 = lines[x]; // now find the act
                if(line2.startsWith("<Act ")) {
                    let destc = parseInt([...line2.matchAll(/destc="?(\d*)"?/g)][0][1]);
                    let destl = parseInt([...line2.matchAll(/destl="?(\d*)"?/g)][0][1]);
                    acts.push({
                        destc, destl
                    })
                    break;
                }
            }
        }
        if(line.startsWith("<Test ")) {
            let posc = parseInt([...line.matchAll(/posc="?(\d*)"?/g)][0][1]);
            let posl = parseInt([...line.matchAll(/posl="?(\d*)"?/g)][0][1]);
            tests.push({
                line: i, posc, posl
            })
        }
   }

   let patches = 0

   for(let act of acts) {
        for(let test of tests) {
            if(test.posc == act.destc && test.posl == act.destl) {
                // process
                let testLine = lines[test.line]; 

                let destyesc = parseInt([...testLine.matchAll(/destyesc="?(\d*)"?/g)][0][1]);
                let destyesl = parseInt([...testLine.matchAll(/destyesl="?(\d*)"?/g)][0][1]);

                // execute order 66
                testLine = testLine.replace(/destnoc=(")?(\d*)(")?/g, `destnoc=$1${destyesc}$3`)
                testLine = testLine.replace(/destnol=(")?(\d*)(")?/g, `destnol=$1${destyesl}$3`)

                lines[test.line] = testLine;
                patches++;
            }
        }
   }

   let output = "";
   for(let line of lines) output += line + "\r\n";

   fs.writeFileSync(root + "\\" + fileName + ".out", output, "utf8")
   console.log(`Patched ${patches} internet check(s) in ${fileName}`)

   processed.push(fileName);
}

const playbooks = globSync("**/*.s", {cwd: `${root}`})
for (const element of playbooks) {
    processFile(element)
}
fs.writeFileSync(`${root}\\_psaPatcher.json`, JSON.stringify(processed, null, 4), "utf-8")