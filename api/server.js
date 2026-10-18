const jsonServer = require('json-server');
const path = require('path');
const fs = require('fs');

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

// 上传图片接口：接收 base64，保存为文件，返回 URL
server.post('/upload', (req, res) => {
  const { image } = req.body || {};
  if (!image) {
    return res.status(400).json({ error: 'No image provided' });
  }

  const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    return res.status(400).json({ error: 'Invalid image format' });
  }

  const ext = matches[1];
  const data = matches[2];
  const filename = `img_${Date.now()}.${ext}`;
  const uploadDir = path.join(__dirname, 'uploads');

  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

  fs.writeFileSync(path.join(uploadDir, filename), data, 'base64');

  res.json({ url: `http://localhost:3000/uploads/${filename}` });
});

server.use('/uploads', jsonServer.defaults({ static: path.join(__dirname, 'uploads') }));
server.use(router);

server.listen(3000, () => {
  console.log('API Server running at http://localhost:3000');
});