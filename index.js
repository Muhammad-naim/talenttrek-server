const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');

//middleWare functions
app.use(cors())
app.use(express.json())

app.get('/', async (req, res) => {
    res.send('server is running')
})

app.get('/menus', async (req, res) => {
    res.send(menuData)
})


app.listen(port, () => {
    console.log(`app is running on port ${port}`);
})