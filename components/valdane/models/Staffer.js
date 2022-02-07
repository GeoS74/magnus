const mongoose = require('mongoose');
const connection = require('@root/libs/connection');

const StafferSchema = new mongoose.Schema({
    avatar: String,              //фото
    name: {                     //имя
        type: String,
        required: 'не заполнено обязательное поле {PATH}',
        unique: 'Не уникальное значение {PATH}',
    },
    personnelNumber: String,    //табельный номер
    position: {                 //должность
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Position'
    },
    skill: String,              //разряд
    passport: String,           //паспортные данные
    birthday: Date,             //день рождения
    contacts: String,           //контактная информация
    placeOfResidence: String,   //место жительства по регистрации
    baseCity: String,           //базовый город
    isBusy: Boolean,            //трудоустроен (да/нет)
    startDate: Date,            //дата принятия на работу
    bankcardNumber: String,     //номер банковской карты
    status: String,             //статус (уволен/работает/кадровый резерв)
    characteristic: String,     //характеристика (опционально)
    biometricData: {
        coveralls: String,      //спец. одежда
        sizeHead: String,       //размер ОГ
        height: String,         //рост
        clothingSize: String,   //размер одежды
        shoeSize: String        //размер обуви
    },
    vaccination: {              //вакцинация
        start: Date,
        end: Date
    }
    // techCenter: {               //технический центр
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'TechCenter'
    // }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

StafferSchema.virtual('files', {
    ref: 'StafferFile',
    localField: '_id',
    foreignField: 'staffer'
});

//меняет Иванов Иван Иванович на Иванов И.И.
StafferSchema.virtual('shortName').get(function(){
    const arr = this.name.split(/[\s.]/);
    const name = arr[1] ? arr[1][0]+'.' : '';
    const surname = arr[2] ? arr[2][0]+'.' : '';
    return `${arr[0]} ${name}${surname}`;
});

StafferSchema.index(
    { name: 'text' }, 
    {
      name: 'TextSearchIndex',
      default_language: 'russian'
  });

module.exports = connection.model('Staffer', StafferSchema);