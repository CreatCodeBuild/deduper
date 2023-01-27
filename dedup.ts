// deno-lint-ignore-file no-namespace no-unused-vars
import { join } from "https://deno.land/std@0.173.0/path/mod.ts";
import { crypto } from "https://deno.land/std@0.173.0/crypto/mod.ts";
import * as csp from "https://raw.githubusercontent.com/CreatCodeBuild/csp/master/src/csp.ts"

interface file {
    path: string    // the absolute path of this file
    name: string    // the base name of this file
    size: number
}

interface fileWithHash {
    path: string    // the absolute path of this file
    name: string    // the base name of this file
    size: number
    hash: string
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
            if (p.isDirectory) {
                yield* walkDir(path)
            }
            if (p.isFile) {
                const fileInfo = await Deno.lstat(path)
                yield {
                    path: path,
                    name: p.name,
                    size: fileInfo.size,
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

function findDup(fileInfos: fileWithHash[]) {

    function sameSize(files: file[]) {
        for (const f of files) {
            if (f.size !== files[0].size) {
                return false
            }
        }
        return true
    }

    const set = new Map<string, file[]>()   // hash -> [info]
    for (const info of fileInfos) {
        if (set.has(info.hash)) {
            set.get(info.hash)?.push(info)
        } else {
            set.set(info.hash, [info])
        }
    }
    return set
}


const rootDir = "./testdata"
const skipDir = "WeChat Files"
const suffix = [".jpg", ".jpeg", ".mp4", ".png", ".m4v", ".mov", ".flv"]


console.log(`Start to scan ${rootDir}`)
// console.log(`Including ${suffix.join(" ")}`)

const startTime = new Date()
// let totalFiles = [] as file[]
const promises = []
for await (const file of walkDir(rootDir)) {
    const promise = Deno.readFile(file.path).then(async bin => {
        const hash = await crypto.subtle.digest(
            "SHA-256",
            bin,
        )
        return {
            hash: new TextDecoder().decode(hash),
            size: file.size,
            name: file.name,
            path: file.path
        }
    });
    promises.push(promise)
}
const totalFiles = await Promise.all(promises)
// console.log(`Time cost ${(new Date()).getTime() - startTime.getTime()} mili sec`)



const filePaths = totalFiles.filter(fileInfo => !fileInfo.path.includes(skipDir))
// const dups = Array.from(findDup(filePaths)).filter(dup => (
//     suffix.filter(suf => dup.name.includes(suf)).length > 0
// ))
const dups = findDup(filePaths)
// const dupSize = dups.reduce((sum, dup) => sum + dup.size * dup.paths.length, 0)
let dupSize = 0
for (const dup of dups.values()) {
    for (const info of dup) {
        dupSize += info.size
    }
}

console.log(`Scanned ${totalFiles.length} files`)
console.log(`Skipped ${totalFiles.length - filePaths.length} files`)
console.log(`There are ${Array.from(dups.values()).reduce((count, dup) => {
    if (dup.length > 1) {
        return count + dup.length
    }
    return count
}, 0)} duplicated files, ${dupSize / 1024 / 1024} MBs`)
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
