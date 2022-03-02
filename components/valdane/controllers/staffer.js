const fs = require('fs');
const sharp = require('sharp');
const Staffer = require('@valdane/models/Staffer');
const StafferFile = require('@valdane/models/StafferFile');
const limitDocs = 50;
const XLSX = require('xlsx'); //https://github.com/SheetJS/sheetjs
const mime = require('mime-types');

exports.checkCredentials = (ctx, next) => {
    if (ctx.request.body.birthday) {
        if (!ctx.getDate(ctx.request.body.birthday)) {
            ctx.status = 400;
            ctx.body = { path: 'birthday', message: 'Не корректная дата' };
            return;
        }
    }
    if (ctx.request.body.startDate) {
        if (!ctx.getDate(ctx.request.body.startDate)) {
            ctx.status = 400;
            ctx.body = { path: 'startDate', message: 'Не корректная дата' };
            return;
        }
    }
    if (ctx.request.body.vaccinationStart) {
        if (!ctx.getDate(ctx.request.body.vaccinationStart)) {
            ctx.status = 400;
            ctx.body = { path: 'vaccinationStart', message: 'Не корректная дата' };
            return;
        }
    }
    if (ctx.request.body.vaccinationEnd) {
        if (!ctx.getDate(ctx.request.body.vaccinationEnd)) {
            ctx.status = 400;
            ctx.body = { path: 'vaccinationEnd', message: 'Не корректная дата' };
            return;
        }
    }
    if (ctx.request.body.position) {
        if (!ctx.checkObjectId(ctx.request.body.position)) {
            ctx.status = 400;
            ctx.body = { path: 'position', message: 'Не валидный id должности' };
            return;
        }
    }
    return next();
};

exports.toExcel = async ctx => {
    try {
        const ws_data = [["№ п/п", "Ф.И.О.", "Табельный номер", "Должность", "Разряд", "Паспорт", "День рождения", "Место жительства", "Контакты",
            "Базовый город", "Номер банк. карты", "Оф. трудоустроен", "Дата принятия на работу", "Статус", "Характеристика",
            "Спец. одежда", "Размер ОГ", "Рост", "Размер одежды", "Размер обуви", "Вакцинация от", "Вакцинация до", "Файлы"]];

        const staffers = await Staffer.find().populate('position').populate('files');

        let i = 1;
        staffers.map(staff => {
            const arr = [
                i++,
                staff.name,
                staff.personnelNumber,
                (staff.position && staff.position.title) ? staff.position.title : '',
                staff.skill,
                staff.passport,
                staff.birthday,
                staff.placeOfResidence,
                staff.contacts,
                staff.baseCity,
                staff.bankcardNumber,
                staff.isBusy ? 'Да' : 'Нет',
                staff.startDate,
                staff.status,
                staff.characteristic,
                staff.biometricData.coveralls,
                staff.biometricData.sizeHead,
                staff.biometricData.height,
                staff.biometricData.clothingSize,
                staff.biometricData.shoeSize,
                staff.vaccination.start,
                staff.vaccination.end,
            ];
            //список прикрепленных файлов
            if (staff.files.length) {
                const arrFiles = [];
                for (let k = 0; k < staff.files.length; k++) {
                    arrFiles.push(`${k + 1}. ${staff.files[k].alias}`);
                }
                arr.push(arrFiles.join("\n"));
            }

            ws_data.push(arr);
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        //Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Сотрудники');

        await XLSX.writeFile(wb, 'files/staffers.xlsx', {
            bookType: 'xlsx'
        });

        ctx.set('content-type', mime.lookup('files/staffers.xlsx'));
        ctx.set('content-disposition', 'attachment; filename="staffers.xlsx"');
        ctx.body = fs.createReadStream('files/staffers.xlsx');

        //delete temp file
        fs.unlink('files/staffers.xlsx', err => {
            if (err) console.log(err);
        });
    }
    catch (error) {
        throw error;
    }
};

exports.changeAvatar = async ctx => {
    if (!ctx.checkObjectId(ctx.request.body.id_staffer)) {
        return ctx.throw(403, 'не валидный id сотрудника');
    }

    if (!ctx.request.files) {
        return ctx.throw(400, 'файл не загружен');
    }

    if (!ctx.request.files.avatar.size) {
        //delete temp file
        fs.unlink(ctx.request.files.avatar.path, err => {
            if (err) console.log(err);
        });
        return ctx.throw(400, 'файл не загружен');
    }

    if (ctx.request.files.avatar.size > 5000000) { //5Mb
        //delete temp file
        fs.unlink(ctx.request.files.avatar.path, err => {
            if (err) console.log(err);
        });
        return ctx.throw(400, 'размер файла превышает 5МБ');
    }

    if (!/image\/\w+/.test(ctx.request.files.avatar.type)) {
        //delete temp file
        fs.unlink(ctx.request.files.avatar.path, err => {
            if (err) console.log(err);
        });
        return ctx.throw(400, 'файл должен быть картинкой');
    }

    let newFileName = 'ava_' + ctx.request.files.avatar.hash + '_' + Date.now() + '.' + ctx.request.files.avatar.name.split('.').pop();

    //change size
    await sharp(ctx.request.files.avatar.path)
        .resize({
            width: 160,
            height: 160,
        })
        // .toFormat('png')
        .toFile('./components/valdane/scancopy/' + newFileName)
        .catch(err => {
            console.log(err);
        });

    //delete temp file
    fs.unlink(ctx.request.files.avatar.path, err => {
        if (err) console.log(err);
    });

    try {
        const staffer = await Staffer.findOneAndUpdate(
            { _id: ctx.request.body.id_staffer },
            { avatar: newFileName },
            { new: false }
        );

        //delete old avatar file
        if (staffer.avatar) {
            fs.unlink('components/valdane/scancopy/' + staffer.avatar, err => {
                if (err) console.log(err);
            });
        }

        ctx.body = { avatar: newFileName };
    }
    catch (error) {
        throw error;
    }
};

exports.uploadFile = async ctx => {
    if (!ctx.checkObjectId(ctx.request.body.id_staffer)) {
        return ctx.throw(403, 'не валидный id сотрудника');
    }


    if (!ctx.request.files) {
        return ctx.throw(400, 'файл не загружен');
    }

    if (!ctx.request.files.scanCopy.size) {
        //delete temp file
        fs.unlink(ctx.request.files.scanCopy.path, err => {
            if (err) console.log(err);
        });
        return ctx.throw(400, 'файл не загружен');
    }

    if (ctx.request.files.scanCopy.size > 50000000) { //50Mb
        //delete temp file
        fs.unlink(ctx.request.files.scanCopy.path, err => {
            if (err) console.log(err);
        });
        return ctx.throw(400, 'файл слишком большой');
    }

    let newFileName = ctx.request.files.scanCopy.hash + '_' + Date.now() + '.' + ctx.request.files.scanCopy.name.split('.').pop();
    fs.rename(ctx.request.files.scanCopy.path, './components/valdane/scancopy/' + newFileName, err => {
        if (err) ctx.throw(500, err);
    });


    const stafferFile = await StafferFile.create({
        staffer: ctx.request.body.id_staffer,
        scanCopyFile: newFileName,
        alias: ctx.request.body.file_alias || undefined
    });

    ctx.body = {
        files: [{
            id: stafferFile._id,
            alias: stafferFile.alias,
            fname: stafferFile.scanCopyFile
        }]
    };
};

exports.delFile = async ctx => {
    const delFile = await StafferFile.findOneAndDelete({ _id: ctx.params.id });
    fs.unlink('./components/valdane/scancopy/' + delFile.scanCopyFile, err => {
        if (err) console.log(err);
    });

    ctx.body = {
        id: ctx.params.id
    };
};

exports.searchStaffers = async ctx => {
    const filter = {
        $text: {
            $search: ctx.request.query.needle,
            $language: 'russian'
        }
    };

    const projection = {
        score: { $meta: "textScore" } //добавить в данные оценку текстового поиска (релевантность)
    };

    if (ctx.request.query.last_id) filter._id = { $lt: ctx.request.query.last_id };

    const staffers = await Staffer
        .find(filter, projection)
        .sort({
            _id: -1,
            //score: { $meta: "textScore" } //сортировка по релевантности
        }).limit(limitDocs)
        .populate('position');

    ctx.body = staffers.map(staff => ({
        id: staff._id,
        name: staff.name,
        status: staff.status,
        position: (staff.position && staff.position.title) ? staff.position.title : '',
        shortName: staff.shortName,
        verified: staff.verified,
    }));
};

//получение списка всех сотрудников (используется в графиках)
exports.allStaffersWithoutLimit = async ctx => {
    try {
        const filter = {};
        const staffers = await Staffer.find(filter)
            .sort({ _id: -1 })
            .populate('position');

        ctx.body = staffers.map(staff => ({
            id: staff._id,
            name: staff.name,
            status: staff.status,
            position: (staff.position && staff.position.title) ? staff.position.title : '',
            shortName: staff.shortName,
        }));
    }
    catch (error) {
        throw error;
    }
};


exports.allStaffers = async (ctx, next) => {
    if (ctx.request.query.needle) return next();

    try {
        const filter = {};

        if (ctx.request.query.last_id) filter._id = { $lt: ctx.request.query.last_id };

        const staffers = await Staffer.find(filter)
            .sort({ _id: -1 })
            .limit(limitDocs)
            .populate('position');
        // console.log(staffers);

        ctx.body = staffers.map(staff => ({
            id: staff._id,
            name: staff.name,
            status: staff.status,
            position: (staff.position && staff.position.title) ? staff.position.title : '',
            shortName: staff.shortName,
            verified: staff.verified,
        }));
    }
    catch (error) {
        throw error;
    }
};

exports.addStaffer = async ctx => {
    try {
        const staffer = await Staffer.create({
            verified: ctx.request.body.hasOwnProperty('verified') || false,
            name: ctx.request.body.name.trim(),
            personnelNumber: ctx.request.body.personnelNumber.trim() || undefined,
            position: ctx.request.body.position || undefined,
            skill: ctx.request.body.skill.trim() || undefined,
            passport: ctx.request.body.passport.trim() || undefined,
            birthday: ctx.getDate(ctx.request.body.birthday) || undefined,
            contacts: ctx.request.body.contacts.trim() || undefined,
            placeOfResidence: ctx.request.body.placeOfResidence.trim() || undefined,
            baseCity: ctx.request.body.baseCity.trim() || undefined,
            isBusy: ctx.request.body.hasOwnProperty('isBusy') || false,
            startDate: ctx.getDate(ctx.request.body.startDate) || undefined,
            bankcardNumber: ctx.request.body.bankcardNumber.trim() || undefined,
            status: ctx.request.body.status.trim() || undefined,
            characteristic: ctx.request.body.characteristic.trim() || undefined,
            biometricData: {
                coveralls: ctx.request.body.coveralls.trim() || undefined,
                sizeHead: ctx.request.body.sizeHead.trim() || undefined,
                height: ctx.request.body.height.trim() || undefined,
                clothingSize: ctx.request.body.clothingSize.trim() || undefined,
                shoeSize: ctx.request.body.shoeSize.trim() || undefined,
            },
            vaccination: {
                start: ctx.getDate(ctx.request.body.vaccinationStart) || undefined,
                end: ctx.getDate(ctx.request.body.vaccinationEnd) || undefined
            }
        });

        ctx.body = {
            id: staffer._id
        };
    }
    catch (error) {
        // console.log(error.errors);

        if (error.name === 'ValidationError') {
            ctx.status = 400;

            if (error.errors.name) {
                if (error.errors.name.kind === 'required') {
                    return ctx.body = { path: 'name', message: 'Ф.И.О. не может быть пустым' };
                }
                if (error.errors.name.kind === 'unique') {
                    return ctx.body = { path: 'name', message: 'Такой сотрудник уже есть' };
                }
            } else throw error; //для ошибок валидации, которые не обрабатываются (напр. не корректный ObjectId должности сотрудника)

        } else throw error;
    }
};

exports.getStaffer = async ctx => {
    if (!ctx.checkObjectId(ctx.params.id)) return ctx.throw(400, 'user not found');
    const staffer = await Staffer.findOne({ _id: ctx.params.id }).populate('position').populate('files');
    if (!staffer) return ctx.throw(400, 'user not found');

    ctx.body = {
        id: staffer._id,
        verified: staffer.verified,
        avatar: staffer.avatar,
        position: staffer.position ? {
            title: staffer.position.title,
            id: staffer.position._id,
        } : {},
        bankcardNumber: staffer.bankcardNumber,
        baseCity: staffer.baseCity,
        biometricData: staffer.biometricData,
        birthday: staffer.birthday,
        characteristic: staffer.characteristic,
        contacts: staffer.contacts,
        isBusy: staffer.isBusy,
        name: staffer.name,
        passport: staffer.passport,
        personnelNumber: staffer.personnelNumber,
        placeOfResidence: staffer.placeOfResidence,
        skill: staffer.skill,
        startDate: staffer.startDate,
        status: staffer.status,
        vaccination: staffer.vaccination || {},
        files: staffer.files ? staffer.files.map(f => ({
            id: f._id,
            alias: f.alias,
            fname: f.scanCopyFile
        })) : {}
    }
};

exports.delStaffer = async ctx => {
    try {
        await Staffer.findOneAndDelete({ _id: ctx.params.id });

        //удаление всех связанных файлов
        const files = await StafferFile.find({ staffer: ctx.params.id });
        if (files.length) {
            for (const file of files) {
                fs.unlink('./components/valdane/scancopy/' + file.scanCopyFile, err => {
                    if (err) console.log(err);
                });
            }
        }
        await StafferFile.deleteMany({ staffer: ctx.params.id });

        ctx.body = {
            id: ctx.params.id
        };
    }
    catch (error) {
        throw error;
    }
};

exports.updStaffer = async ctx => {
    try {
        const staffer = await Staffer.findOneAndUpdate(
            { _id: ctx.params.id },
            {
                name: ctx.request.body.name.trim(),
                verified: ctx.request.body.hasOwnProperty('verified') || false,
                personnelNumber: ctx.request.body.personnelNumber.trim() || null,
                position: ctx.request.body.position || null,
                skill: ctx.request.body.skill.trim() || null,
                passport: ctx.request.body.passport.trim() || null,
                birthday: ctx.getDate(ctx.request.body.birthday) || null,
                contacts: ctx.request.body.contacts.trim() || null,
                placeOfResidence: ctx.request.body.placeOfResidence.trim() || null,
                baseCity: ctx.request.body.baseCity.trim() || null,
                isBusy: ctx.request.body.hasOwnProperty('isBusy') || false,
                startDate: ctx.getDate(ctx.request.body.startDate) || null,
                bankcardNumber: ctx.request.body.bankcardNumber.trim() || null,
                status: ctx.request.body.status.trim() || null,
                characteristic: ctx.request.body.characteristic.trim() || null,
                biometricData: {
                    coveralls: ctx.request.body.coveralls.trim() || null,
                    sizeHead: ctx.request.body.sizeHead.trim() || null,
                    height: ctx.request.body.height.trim() || null,
                    clothingSize: ctx.request.body.clothingSize.trim() || null,
                    shoeSize: ctx.request.body.shoeSize.trim() || null,
                },
                vaccination: {
                    start: ctx.getDate(ctx.request.body.vaccinationStart) || null,
                    end: ctx.getDate(ctx.request.body.vaccinationEnd) || null
                }
            },
            {
                new: true,
                runValidators: true //запускает валидаторы схемы перед записью
            }
        );
        ctx.body = { id: staffer._id };
    }
    catch (error) {
        if (error.name === 'ValidationError') {
            ctx.status = 400;

            if (error.errors.name) {
                if (error.errors.name.kind === 'required') {
                    return ctx.body = { path: 'name', message: 'Ф.И.О. не может быть пустым' };
                }
                if (error.errors.name.kind === 'unique') {
                    return ctx.body = { path: 'name', message: 'Такой сотрудник уже есть' };
                }
            } else throw error; //для ошибок валидации, которые не обрабатываются (напр. не корректный ObjectId должности сотрудника)

        } else throw error;
    }
};


function delay(ms) {
    return new Promise(res => {
        setTimeout(_ => res(), ms);
    });
}