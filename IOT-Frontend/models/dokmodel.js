const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
    deviceid: {
        required: true,
        type: String
    },
    filename: {
        required: true,
        type: String
    },
    content: {
	required: true,
	type: Array
    },
    label: {
        required: false,
        type: String
    },
    size: {
        required: false,
        type: Number
    },
    type: {
        required: false,
        type: String
    }
})

module.exports = mongoose.model('dokData', dataSchema)
