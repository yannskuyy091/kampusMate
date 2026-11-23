require('dotenv').config();
const express = require('express');
const cors = require('cors');
const elearningRoutes = require('./routes/elearningRoutes');
const plannerRoutes = require('./routes/plannerRoutes');
const { startCronJobs } = require('./services/cronScheduler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api/elearning', elearningRoutes);
app.use('/api/planner', plannerRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'KampusMate Backend API berjalan!' });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
  startCronJobs();
});