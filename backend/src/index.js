const app = require('./app');
const { getPort } = require('./config');

const port = getPort();

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
