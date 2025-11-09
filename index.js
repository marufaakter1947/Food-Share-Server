const express = require('express')
const app = express()
const port =process.env.PORT || 3000

app.get('/', (req, res) => {
  res.send('Food Share Server is Running')
})

app.listen(port, () => {
  console.log(`Food Share Server  listening on port ${port}`)
})
