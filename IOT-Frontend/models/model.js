const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
    name: {
        required: true,
        type: String
    },
    deviceId: {
        required: false,
        type: String
    },
    type: {
        required: false,
        type: String
    },
    doks: {
        required: false,
        type: Array
    },
    files: {
        required: false,
        type: Array
    },
    links: {
        required: false,
        type: Array
    },
    camstart: {
        required: false,
        type: Object
    },
    parts: {
	required: true,
	type: Array
    },
    signs: {
	required: true,
	type: Array
    },
    routes: {
	required: false,
	type: Array
    },
})

module.exports = mongoose.model('Data', dataSchema)
