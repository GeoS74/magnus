const connection = require('@root/libs/connection')
const mongoose = require('mongoose')

const Schema = new mongoose.Schema({
    count: {
        type: Number,
        default: 1
    },
    carrier: String,
}, {
    timestamps: true
})

//получить последнюю запись
//если её нет или дата создания не соответствует сегодняшнему дню - создать запись
//иначе увеличить счётчик
Schema.statics.plus = async function(carrier){
    const obj = await this.findOne({carrier: carrier}).sort({_id: -1});

    if(!obj || this.formatDate( new Date()) !== this.formatDate(new Date(obj.createdAt))) {
        return this.create({carrier: carrier});
    }

    await this.findOneAndUpdate({_id: obj._id}, {count: obj.count+1})
}

Schema.statics.formatDate = function(date){
    return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
}

module.exports = connection.model('MetricCounter', Schema)