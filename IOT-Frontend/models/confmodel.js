const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
    info: {
        required: true,
        type: String
    },
    deftwin: {
        required: false,
        type: String
    }

})

module.exports = mongoose.model('confData', dataSchema)
