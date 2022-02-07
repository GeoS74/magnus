"use strict"
class Chart {
    _dateStart;
    _dateEnd;
    // _monthOfPeriod; //не используется
    _daysOfPeriod;
    _container;
    _width;     //равна ширине _container
    _height;    //вычисляется относительно кол-ва строк
    _rows = new Map;
    _periodPaddingLeft;
    _step;
    _heightRow = 40; //высота одной строки
    _fontSize = 16;
    _colorBlock = '#2780e3';
    _colorText = '#373a3c';
    _headerFirstColumn = 'Сотрудники';
    _monthRus = ['янв.', 'фев.', 'мар.', 'апр.', 'май', 'июн.', 'июл.', 'авг.', 'сен.', 'окт.', 'ноя.', 'дек.'];

    constructor() {
        //установить по умолчанию период - текущий год
        this.setPeriod();
    }

    //public methods
    draw() {
        this._container.insertAdjacentHTML('beforeend', this._render());
    }
    setPeriod(dateStart, dateEnd) {
        const start = dateStart || new Date();
        const end = dateEnd || new Date();

        if (!dateStart) start.setMonth(0);
        if (!dateEnd) end.setMonth(11);

        start.setDate(1);
        end.setMonth(end.getMonth() + 1); //установить следующий месяц
        end.setDate(0); //откатиться на 1 день (+100 к решению проблемы високосного года)

        this._dateStart = start;
        this._dateEnd = end;

        this._daysOfPeriod = (end - start) / 1000 / 60 / 60 / 24 + 1;
        // this._monthOfPeriod = this._diffMonth(start, end);
    }
    addRow(data) {
        const period = this._rows.get(data[0]) || [];
        period.push([...data.slice(1)]);
        this._rows.set(data[0], period);
    }
    set container(elem) {
        this._container = elem;
    }
    get container() {
        return this._container;
    }

    //private methods
    _makeGrid() {
        let result;
        //vertical line
        for (let i = 1, padding = 0; ; i++) {
            //установить date на крайний день месяца
            const date = new Date(this._dateStart.getFullYear(), this._dateStart.getMonth() + i, 0);
            //если временная метка date превысит крайнюю дату - завершить итерации
            if (date.getTime() > this._dateEnd.getTime()) break;

            result += `<line x1="${this._periodPaddingLeft + padding}" x2="${this._periodPaddingLeft + padding}" 
                                    y1="0" y2="${this._height}" 
                                    stroke="black" stroke-width="1"/>`;

            padding += date.getDate() * this._step; //смещение (по нарастающей)
        }
        //horizontal line
        for (let i = 1; i < this._rows.size + 1; i++) { //+1 строка для header
            result += `<line x1="0" x2="${this._width}" 
                                    y1="${this._heightRow * i}" y2="${this._heightRow * i}" 
                                    stroke="black" stroke-width="1"/>`;
        }
        return result;
    }
    /*вариация функции построения сетки, всегда рисует крайнюю правую линию, совпадающую с контуром
    _makeGrid() {
        let result = `<line x1="${this._periodPaddingLeft}" x2="${this._periodPaddingLeft}" y1="0" y2="${this._height}" 
            stroke="black" stroke-width="1"/>`;
        //vertical line
        for(let i = 1, padding = 0;; i++) {
            //установить date на крайний день стартового месяца
            const date = new Date(this._dateStart.getFullYear(), this._dateStart.getMonth()+i, 0);
            if( date.getTime() > this._dateEnd.getTime() ) break;
            
            const days = date.getDate(); //кол-во дней в месяце

            padding += days * this._step; //смещение (по нарастающей)

            result += `<line x1="${this._periodPaddingLeft + padding}" x2="${this._periodPaddingLeft + padding}" 
                        y1="0" y2="${this._height}" 
                        stroke="black" stroke-width="1"/>`;
        }

        //horizontal line
        for(let i = 1; i < this._rows.size; i++) {
            result += `<line x1="0" x2="${this._width}" 
                        y1="${this._heightRow * i}" y2="${this._heightRow * i}" 
                        stroke="black" stroke-width="1"/>`;
        }
        return result;
    }*/
    _makePeriodBlocks(periods, offset) {
        let result = ` <rect opacity="0"
                                width="${this._width - this._periodPaddingLeft}" height="${this._heightRow}"
                                x="${this._periodPaddingLeft}" 
                                y ="${offset}
                                "/>`;
        for (let period of periods) {
            //кол-во дней от начала графика до начала блока
            let diffDayStart = (period[0] - this._dateStart) / 1000 / 60 / 60 / 24;
            diffDayStart = (diffDayStart <= 0) ? 0 : Math.round(diffDayStart);
            //левая граница блока превышает правую границу периода графика - завершить итерацию
            if (diffDayStart >= this._daysOfPeriod) continue;


            //кол-во дней от начала графика до начала блока
            let diffDayEnd = (period[1] - this._dateStart) / 1000 / 60 / 60 / 24;
            diffDayEnd = (diffDayEnd >= this._daysOfPeriod) ? this._daysOfPeriod : Math.round(diffDayEnd);
            //правая граница блока меньше левой границы периода графика - завершить итерацию
            if (diffDayEnd < 0) continue; //если 0 - период составляет 1 день

            result += `<g>
                            <title>${this._getFormatDateForTitle(period[0])} - ${this._getFormatDateForTitle(period[1])}</title>
                            <rect data-period-start="${period[0].getTime()}" data-period-end="${period[1].getTime()}"
                            class="period-block"
                            width="${(diffDayEnd - diffDayStart + 1) * this._step}" height="${this._heightRow}" fill="${this._colorBlock}" 
                            stroke="red" stroke-width="0"
                                x="${this._periodPaddingLeft + diffDayStart * this._step}" 
                                y ="${offset}
                                "/>
                            </g>`;
        }
        return result;
    }
    _getFormatDateForTitle(date) {
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }
    _makeText(text, offset) {
        return `<text x="10" y="${offset}" font-size="${this._fontSize}" fill="${this._colorText}">${text}</text>`;
    }
    _makeHeaderRow() {
        let result = '';
        const offset = this._heightRow / 2 + this._fontSize / 2;
        result += `<text 
                            x="10" 
                            y="${offset}" 
                            font-size="${this._fontSize}" 
                            fill="${this._colorText}" 
                            font-weight="bold">${this._headerFirstColumn}
                            </text>`;

        for (let i = 1, padding = 0; ; i++) {
            //установить date на крайний день месяца
            const date = new Date(this._dateStart.getFullYear(), this._dateStart.getMonth() + i, 0);
            //если временная метка date превысит крайнюю дату - завершить итерации
            if (date.getTime() > this._dateEnd.getTime()) break;

            result += `<text x="${this._periodPaddingLeft + padding + 18}" y="${offset - 10}" font-size="${this._fontSize - 2}" fill="${this._colorText}">
                            ${this._monthRus[date.getMonth()]}
                             <tspan x="${this._periodPaddingLeft + padding + 17}" y="${offset + 5}">${date.getFullYear()}</tspan>
                        </text>`;

            padding += date.getDate() * this._step; //смещение (по нарастающей)
        }

        return result;
    }
    _makeRows() {
        let result = this._makeHeaderRow(),
            i = 1;
        for (const row of this._rows) {
            const offsetText = i * this._heightRow + this._heightRow / 2 + this._fontSize / 2;
            const offsetBlock = i * this._heightRow;
            result += this._makeText(row[0], offsetText);
            result += this._makePeriodBlocks(row[1], offsetBlock);
            i++;
        }
        return result;
    }
    _render() {
        this._setSize();
        return `<svg version="1.1" baseProfile="full" width="${this._width}" height="${this._height}" xmlns="http://www.w3.org/2000/svg">
                            <rect width="${this._width}" height="${this._height}" x="0" y="0" fill="none" stroke="black"/>
                            ${this._makeRows()}
                            ${this._makeGrid()}
                            </svg>`;
    }
    _diffMonth(d1, d2) {
        let months;
        months = (d2.getFullYear() - d1.getFullYear()) * 12;
        months -= d1.getMonth();
        months += d2.getMonth() + 1;
        return months;
    }
    _setSize() {
        //установить ширину svg равную _container
        const style = getComputedStyle(this._container);
        //преобразовать ширину в число для дальнейших вычислений
        this._width = +style.width.match(/\d+/)[0];
        //установить высоту svg
        this._height = (this._rows.size + 1) * this._heightRow; //+1 строка для header
        //установить отступ для блоков с периодами
        this._periodPaddingLeft = Math.round(this._width * 0.2);
        //установить размер в пикселях для одного дня в зависимости от выбранного периода
        this._step = (this._width - this._periodPaddingLeft) / this._daysOfPeriod;
    }
}