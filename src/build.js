const ejs = require('ejs')
const fs = require('fs')
const path = require('path')
const marked = require('marked')

function promisify(f) {
  return function (...args) {
    return new Promise((resolve, reject) => {
      function callback(err, result) {
        if (err) {
          return reject(err)
        } else {
          resolve(result)
        }
      }
      args.push(callback)
      f.call(this, ...args)
    })
  }
}

function title(str) {
  return str.charAt(0).toUpperCase() + 
    str.slice(1).toLowerCase()
}

function nameof(path) {
  const answer = path.replace(/\-/g, ' ')
  return title(answer)
}

function filename(file) {
  return path.parse(file).name
}

const readdir = promisify(fs.readdir)
const readFile = promisify(fs.readFile)
const renderFile = promisify(ejs.renderFile)
const writeFile = promisify(fs.writeFile)
const unlink = promisify(fs.unlink)

const mardownDirPath = path.join(__dirname, '..', 'markdown')
const indexViewPath = path.join(__dirname, '..', 'views', 'index.ejs')
const postViewPath = path.join(__dirname, '..', 'views', 'post.ejs')
const publicDirPath = path.join(__dirname, '..', 'public')

async function clearPublicDir() {
  const files = await readdir(publicDirPath)
  const results = files.map(async (file) => {
    if(!file.endsWith('.html')) return
    const filepath = path.join(publicDirPath, file)
    await unlink(filepath)
    console.log(`~Unlinked ${file}`)
  })
  Promise.all(results)
    .then(() => console.log('UNLINKING DONE!'))
    .catch(err => console.error(err))
}

async function main() {
  try {
    await clearPublicDir()
    const posts = await readdir(mardownDirPath)

    // creating index page
    const indexPageContent = await renderFile(indexViewPath, {
      posts: posts.map(post => {
        const name = filename(post)
        return {
          href: `${name}.html`,
          title: nameof(name)
        }
      })
    })
    writeFile(path.join(publicDirPath, 'index.html'), indexPageContent)
      .then(() => console.log('*Created index.html*'))
      .catch(err => console.error(err))
    
    // generating posts
    const results = posts.map(async (post) => {
      const markdown = await readFile(path.join(mardownDirPath, post), 'utf8')
      const html = marked.marked.parse(markdown)
      const postContent = await renderFile(postViewPath, { html, title: nameof(filename(post)) })
      await writeFile(path.join(publicDirPath, `${filename(post)}.html`), postContent)
      console.log(`*Compiled ${post}*`)
    })
    Promise.all(results)
      .then(() => console.log('GENERATING DONE!'))
      .catch(err => console.error(err))
  } catch(err) {
    console.error(err)
    process.exit(1)
  }
}

main()
