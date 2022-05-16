const express = require('express');
const cors = require('cors');

// creating an instance of express
const app = express();

// adding body to json parser middleware
app.use(express.json());

// enabling cross origin resource access
app.use(cors());

// adding resume parser controller
app.use("/parse", require("./controllers/resumeParser"));

// listening to connections to port 3000 on localhost
app.listen(3000, () => {
    console.log(`Server started on 3000`);
});