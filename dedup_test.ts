import { main } from "./dedup.ts";


Deno.test("1", async _ => {
    const rootDir = "./testdata"
    const skipDir = "WeChat Files"
    const suffix = [".jpg", ".jpeg", ".mp4", ".png", ".m4v", ".mov", ".flv"]
    
    await main(rootDir, skipDir, suffix)
})
