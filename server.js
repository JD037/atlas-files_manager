import express from 'express';
import routes from './routes/index';

const app = express();
const port = process.env.PORT || 5000;

// 1 - Parse JSON bodies as sent by API clients (it executes first this one)
app.use(express.json());
// 2- Parse URL-encoded bodies
app.use(routes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
