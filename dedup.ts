interface file {
    path: string
    name: string
    size: number
}

async function walkDir(rootDir: string) {
    const dir = Deno.readDir(rootDir)
    let paths: Array<file> = []
    try {
        for await (const p of dir) {
            const path = [rootDir, p.name].join(`\\`)
            if(p.isDirectory) {
                const subPaths = await walkDir(path)
                paths = paths.concat(subPaths)
            }
            if(p.isFile) {
                const f = await Deno.open(path)
                paths.push({
                    path: path,
                    name: p.name,
                    size: (await f.stat()).size
                })
            }
        }
    
    } catch (e) {
        console.log(e)
    }
    return paths
}
interface dup {
    name: string
    size: number
    paths: string[]
}

function dupSize(dup: dup) {
    return dup.size * dup.paths.length - 1
}

function dupsToRemove(dup: dup) {
    return {
        keep: dup.paths[0],
        remove: dup.paths.slice(1)
    }
}

function* findDup(paths: file[]) {

    function sameSize(files: file[]) {
        for(const f of files) {
            if(f.size !== files[0].size) {
                return false
            }
        }
        return true
    }

    console.log("total files", paths.length)
    const set = new Map<string, file[]>()
    for(const p of paths) {
        if(set.has(p.name)) {
            set.get(p.name)?.push(p)
        } else {
            set.set(p.name, [p])
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


const dPaths = await walkDir(`D:\\`)
const ePaths = await walkDir(`E:\\`)
const dups = Array.from(findDup(dPaths.concat(ePaths)))

console.log("dups", dups.length)
// console.log(JSON.stringify(dups, null, '  '))
for(const dup of dups) {
    console.log(dupSize(dup))
    console.log(...dup.paths)
}

function dupsToDelete(dups: dup[]) {
    return dups.map(dupsToRemove)
}

const total = dups.map(dupSize).reduce((pre,cur) => pre+cur,0)
console.log(total, JSON.stringify(dupsToDelete(dups)))

// for(const filesToDelete of dupsToDelete(dups)) {
//     console.log("keeping", filesToDelete.keep)
//     for(const path of filesToDelete.remove) {
//         console.log("removing", path)
//         await Deno.remove(path)
//     }
//     console.log()
// }