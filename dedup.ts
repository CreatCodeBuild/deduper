// deno-lint-ignore-file no-namespace
import { join } from "https://deno.land/std@0.173.0/path/mod.ts";
import { wrap } from "./iter.ts";
interface file {
    path: string    // the absolute path of this file
    name: string    // the base name of this file
    size: number
}

namespace Duplication {
    export interface Data {
        name: string
        size: number
        paths: string[]
    }
    
    export function size(dup: Data) {
        return dup.size * dup.paths.length - 1
    }
}


async function* walkDir(rootDir: string): AsyncGenerator<file> {
    const dir = await Deno.readDir(rootDir)
    try {
        for await (const p of dir) {
            const path = join(rootDir, p.name)
            if(p.isDirectory) {
                yield * walkDir(path)
            }
            if(p.isFile) {
                const fileInfo = Deno.lstatSync(path)
                yield {
                    path: path,
                    name: p.name,
                    size: fileInfo.size
                }
            }
        }
    } catch (e) {
        console.log(e)
    }
}




function dupsToRemove(dup: Duplication.Data) {
    return {
        keep: dup.paths[0],
        remove: dup.paths.slice(1)
    }
}

function* findDup(fileInfos: file[]) {

    function sameSize(files: file[]) {
        for(const f of files) {
            if(f.size !== files[0].size) {
                return false
            }
        }
        return true
    }

    const set = new Map<string, file[]>()   // file name -> [info]
    for(const info of fileInfos) {
        if(set.has(info.name)) {
            set.get(info.name)?.push(info)
        } else {
            set.set(info.name, [info])
        }
    }
    console.log("files with unique name", set.size)
    for(const [k, v] of set.entries()) {
        if(v.length > 1 && sameSize(v)) {
            yield {
                name: k,
                size: v[0].size,
                paths: v.map(f => f.path)
            }
        }
    }
}


const rootDir = "/home/xiang"
const skipDir = "WeChat Files"
const suffix = [".jpg", ".jpeg", ".mp4", ".png", ".m4v", ".mov", ".flv"]


console.log(`Start to scan ${rootDir}`)
console.log(`Skipping ${suffix.join(" ")}`)

const wrapper = wrap(walkDir(rootDir))
const startTime = new Date()
const totalFiles = await wrapper.finalize()
// console.log(`Time cost ${(new Date()).getTime() - startTime.getTime()} mili sec`)

const filePaths = totalFiles.filter(fileInfo => !fileInfo.path.includes(skipDir))
const dups = Array.from(findDup(filePaths)).filter(dup=>(
    suffix.filter(suf => dup.name.includes(suf)).length > 0
))
const dupSize = dups.reduce((sum, dup) => sum + dup.size * dup.paths.length, 0)

console.log(`Scanned ${totalFiles.length} files`)
console.log(`Skipped ${totalFiles.length - filePaths.length} files`)
console.log(`There are ${dups.length} duplicated files, ${dupSize / 1024 / 1024} MBs`)
// console.table(dups.map(dup=>({
//     size: dupSize(dup),
//     count: dup.paths.length,
//     paths: JSON.stringify(dup.paths)
// })))

function dupsToDelete(dups: Duplication.Data[]) {
    return dups.map(dupsToRemove)
}

// const total = dups.map(dupSize).reduce((pre,cur) => pre+cur,0)
// console.log(total, JSON.stringify(dupsToDelete(dups)))

// for(const filesToDelete of dupsToDelete(dups)) {
//     console.log("keeping", filesToDelete.keep)
//     for(const path of filesToDelete.remove) {
//         console.log("removing", path)
//         await Deno.remove(path)
//     }
//     console.log()
// }
console.log(`Time cost ${(new Date()).getTime() - startTime.getTime()} mili sec`)
