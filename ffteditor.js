class tool {
    constructor(data) {
        this.pdata = data;
    }
    onmousedown(e) { throw "Not implemented" };
    onmouseup(e) { throw "Not implemented" };
    onmousemove(e) { throw "Not implemented" };
    onmouseout(e) { throw "Not implemented" };
}

class pantool extends tool {
    constructor(data) {
        super(data);
        this.down = null;
    }

    onmousedown(e) { this.down = e; };
    onmouseup(e) { this.down = null; };
    onmousemove(e) {
        if (this.down) {
            let dx = e.clientX - this.down.clientX;
            let dy = e.clientY - this.down.clientY;
            this.pdata.tx += dx;
            this.pdata.ty += dy;
            this.down = e;
        }
    };

    onmouseout(e) { this.down = null; };
}

class erasetool extends tool {
    constructor(data) {
        super(data);
        this.down = null;
        this.newPoints = [];
    }

    getErasedPoints()
    {
        return this.newPoints;
    }

    onmousedown(e) {
        
        this.newPoints = [];
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        //convert canvas point to image point
        const ximg = x - (this.pdata.tx);
        const yimg = y - (this.pdata.ty);

        //check if point is on image
        if (ximg > 0 && ximg < this.pdata.imageWidth) {
            if (yimg > 0 && yimg < this.pdata.imageHeight) {
                let inside = false;

                if (this.pdata.erasedPoints.length > 0) {
                    for (let i = 0; i < this.pdata.erasedPoints.length; i++) {
                        if (!this.isPointInCircuference(ximg, yimg, this.pdata.erasedPoints[i].x, this.pdata.erasedPoints[i].y, 1))
                            this.down = e;
                        else {
                            inside = true;
                            break;
                        }
                    }
                }

                if (!inside) {
                    this.down = e;
                    let center = { "x": this.pdata.imageWidth / 2, "y": this.pdata.imageHeight / 2 };
                    this.pdata.erasedPoints.push({ "x": ximg, "y": yimg });
                    this.pdata.erasedPoints.push({ "x": center.x + (center.x - ximg), "y": center.y + (center.y - yimg) });
                    this.newPoints.push({ "x": ximg, "y": yimg });
                    this.newPoints.push({ "x": center.x + (center.x - ximg), "y": center.y + (center.y - yimg) });
                }
            }
        }
    };
    onmouseup(e) { this.down = null; };
    onmousemove(e) {
        if (this.down) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            //convert canvas point to image point
            const ximg = x - (this.pdata.tx);
            const yimg = y - (this.pdata.ty);

            //check if point is on image
            if (ximg > 0 && ximg < this.pdata.imageWidth) {
                if (yimg > 0 && yimg < this.pdata.imageHeight) {
                    let inside = false;

                    if (this.pdata.erasedPoints.length > 0) {
                        for (let i = 0; i < this.pdata.erasedPoints.length; i++) {
                            if (!this.isPointInCircuference(ximg, yimg, this.pdata.erasedPoints[i].x, this.pdata.erasedPoints[i].y, 1))
                                this.down = e;
                            else {
                                inside = true;
                                break;
                            }
                        }
                    }

                    if (!inside) {
                        this.down = e;
                        let center = { "x": this.pdata.imageWidth / 2, "y": this.pdata.imageHeight / 2 };
                        this.pdata.erasedPoints.push({ "x": ximg, "y": yimg });
                        this.pdata.erasedPoints.push({ "x": center.x + (center.x - ximg), "y": center.y + (center.y - yimg) });
                        this.newPoints.push({ "x": ximg, "y": yimg });
                        this.newPoints.push({ "x": center.x + (center.x - ximg), "y": center.y + (center.y - yimg) });
                    }
                }
            }
        }
    };

    onmouseout(e) { this.down = null; };

    isPointInCircuference(x, y, xc, yc, r) {
        //(x - xc)^2 + (y - yc)^2 >= R^2
        return (Math.pow(x - xc, 2) + Math.pow(y - yc, 2) <= Math.pow(r, 2))
    }
}

class paintdata {
    constructor() {
        this.tx = 0;
        this.ty = 0;
        this.imageWidth = 0;
        this.imageHeight = 0;
        this.erasedPoints = [];
        this.radiusErased = 10;
    }
}

class action
{
    constructor(editor){ this.editor = editor; }
    do(){ throw "Not implemented";}
    undo(){ throw "Not implemented";}
}

class eraseraction extends action
{
    constructor(editor, erasedPixels, erasedPoints){
        super(editor);        
        this.oldvalues = [];

        for (let i = 0; i < erasedPixels.length; i++) {
            if (erasedPixels[i] == 0) {
                this.oldvalues.push({
                    "r" : this.editor.fft_result.real[i],
                    "i" : this.editor.fft_result.imag[i],
                    "index" : i
                });
            }
        }

        this.oldPoints = [];
        for (let i = 0; i < erasedPoints.length; i++) {
            this.oldPoints.push({"x" : erasedPoints[i].x, "y" : erasedPoints[i].y});
        }
    }

    do() { 

        for(let j = 0 ; j < this.oldPoints.length ; j++)
        {
            let notfound = true;
            for(let i = 0 ; i < this.editor.pdata.erasedPoints.length ; i++)
            {
                if(this.editor.pdata.erasedPoints[i].x == this.oldPoints[j].x &&
                    this.editor.pdata.erasedPoints[i].y == this.oldPoints[j].y)
                {
                    notfound = false;
                    break;                    
                }
            }

            if(notfound)
                this.editor.pdata.erasedPoints.push({"x" : this.oldPoints[j].x, "y" : this.oldPoints[j].y });
        }

        for (let i = 0; i < this.oldvalues.length; i++) {
            this.editor.fft_result.real[this.oldvalues[i].index] = 0;
            this.editor.fft_result.imag[this.oldvalues[i].index] = 0;
        }
        this.executeFFTBackward();        
    }
    
    undo(){     

        for(let i = 0 ; i < this.editor.pdata.erasedPoints.length ; i++)
        {
            for(let j = 0 ; j < this.oldPoints.length ; j++)
            {
                if(this.editor.pdata.erasedPoints[i].x == this.oldPoints[j].x &&
                    this.editor.pdata.erasedPoints[i].y == this.oldPoints[j].y)
                {
                    this.editor.pdata.erasedPoints.splice(i, 1);
                    i--;
                    break;
                }
            }
        }

        for (let i = 0; i < this.oldvalues.length; i++) {
            this.editor.fft_result.real[this.oldvalues[i].index] = this.oldvalues[i].r;
            this.editor.fft_result.imag[this.oldvalues[i].index] = this.oldvalues[i].i;
        }
        this.executeFFTBackward();        
    }

    executeFFTBackward()
    {       
        this.editor.fft_backward(this.editor.fft_result.real, this.editor.fft_result.imag, this.editor.fft_result.width, this.editor.fft_result.height).then((backward) => {
            this.editor.outputimage = backward;
            this.editor.paintAll();
        }, (error) => {
            console.error("Erro ao fazer a fft inversa");
            console.log(error);
        });
    }
}

class ffteditor {

    static api = null;

    constructor() {

        this.id = 1;
        this.image = null;
        this.originalimage = null;
        this.spectre = null;
        this.outputimage = null;
        this.fft_result = null;

        this.pdata = new paintdata();
        this.tool = new pantool(this.pdata);

        this.actions = [];
        this.indexactions = -1;

        const instance = this;
        const collection = document.querySelectorAll('[ffteditor]');

        for (let i = 0; i < collection.length; i++) {
            this.id = collection[i].getAttribute('ffteditor');

            let table =

                '<div class="btn-group" style="margin-bottom: 2px;">' +
                '   <button class="button-normal" id="btnFile' + this.id + '" for="imgFile' + this.id + '">'+
                '        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-file-earmark-image-fill" viewBox="0 0 16 16">'+
                '            <path d="M4 0h5.293A1 1 0 0 1 10 .293L13.707 4a1 1 0 0 1 .293.707v5.586l-2.73-2.73a1 1 0 0 0-1.52.127l-1.889 2.644-1.769-1.062a1 1 0 0 0-1.222.15L2 12.292V2a2 2 0 0 1 2-2m5.5 1.5v2a1 1 0 0 0 1 1h2zm-1.498 4a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0"/>'+
                '            <path d="M10.564 8.27 14 11.708V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-.293l3.578-3.577 2.56 1.536 2.426-3.395z"/>'+
                '        </svg>'+
                '        File'+
                '   </button>'+
                '   <button class="button-normal button-disabled" id="btnUndo' + this.id + '">'+
                '        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-arrow-90deg-left" viewBox="0 0 16 16">'+
                '            <path fill-rule="evenodd" d="M1.146 4.854a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H12.5A2.5 2.5 0 0 1 15 6.5v8a.5.5 0 0 1-1 0v-8A1.5 1.5 0 0 0 12.5 5H2.707l3.147 3.146a.5.5 0 1 1-.708.708z"/>'+
                '        </svg>'+    
                '        Undo'+
                '   </button>'+
                '   <button class="button-normal button-disabled" id="btnDo' + this.id + '">'+
                '        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-arrow-90deg-right" viewBox="0 0 16 16">'+
                '            <path fill-rule="evenodd" d="M14.854 4.854a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 4H3.5A2.5 2.5 0 0 0 1 6.5v8a.5.5 0 0 0 1 0v-8A1.5 1.5 0 0 1 3.5 5h9.793l-3.147 3.146a.5.5 0 0 0 .708.708z"/>'+
                '        </svg>'+    
                '        Do'+
                '   </button>'+
                '   <input type="file" id="imgFile' + this.id + '" accept="image/png, image/jpeg" title="image"/>' +
                '   <button class="check-button-normal" id="btnPan' + this.id + '">'+
                '        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-arrows-move" viewBox="0 0 16 16">'+
                '            <path fill-rule="evenodd" d="M7.646.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 1.707V5.5a.5.5 0 0 1-1 0V1.707L6.354 2.854a.5.5 0 1 1-.708-.708zM8 10a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 .708-.708L7.5 14.293V10.5A.5.5 0 0 1 8 10M.146 8.354a.5.5 0 0 1 0-.708l2-2a.5.5 0 1 1 .708.708L1.707 7.5H5.5a.5.5 0 0 1 0 1H1.707l1.147 1.146a.5.5 0 0 1-.708.708zM10 8a.5.5 0 0 1 .5-.5h3.793l-1.147-1.146a.5.5 0 0 1 .708-.708l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L14.293 8.5H10.5A.5.5 0 0 1 10 8"/>'+
                '        </svg>'+  
                '        Pan'+
                '   </button>'+
                '   <button class="check-button-normal" id="btnErase' + this.id + '">'+
                '        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-eraser-fill" viewBox="0 0 16 16">'+
                '            <path d="M8.086 2.207a2 2 0 0 1 2.828 0l3.879 3.879a2 2 0 0 1 0 2.828l-5.5 5.5A2 2 0 0 1 7.879 15H5.12a2 2 0 0 1-1.414-.586l-2.5-2.5a2 2 0 0 1 0-2.828zm.66 11.34L3.453 8.254 1.914 9.793a1 1 0 0 0 0 1.414l2.5 2.5a1 1 0 0 0 .707.293H7.88a1 1 0 0 0 .707-.293z"/>'+
                '        </svg>'+    
                '        Eraser'+
                '   </button>'+      
                '   <button class="button-normal button-disabled" id="btnExport' + this.id + '">'+
                '        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-file-earmark-arrow-down-fill" viewBox="0 0 16 16">'+
                '            <path d="M9.293 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0M9.5 3.5v-2l3 3h-2a1 1 0 0 1-1-1m-1 4v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 .708-.708L7.5 11.293V7.5a.5.5 0 0 1 1 0"/>'+
                '        </svg>'+
                '        Export'+
                '   </button>'+                
                '</div>' +
                '<div style="overflow:auto">' +
                '   <canvas class="left" id="fftEditorCanvas' + this.id + '" ></canvas>' +
                '   <canvas class="right" id="fftOutputImage' + this.id + '" ></canvas>' +
                '</div>';

            collection[i].innerHTML = table;
        }

        this.editorCanvas = document.getElementById('fftEditorCanvas' + this.id);
        this.outputCanvas = document.getElementById('fftOutputImage' + this.id);
       

        this.addCanvasEventListener(this.editorCanvas);

        document.getElementById('btnFile' + this.id).addEventListener("click", (e) => {
            document.getElementById('imgFile' + this.id).click();
        });


        document.getElementById('imgFile' + this.id).addEventListener("cancel", () => {
            console.log("Cancelled.");
        });

        document.getElementById('imgFile' + this.id).addEventListener("change", (e) => {
            if (document.getElementById('imgFile' + this.id).files.length == 1) {
                console.log("File selected: ", document.getElementById('imgFile' + this.id).files[0]);

                var img = new Image;
                img.onload = function () {
                    instance.setImage(img);
                }
                img.src = URL.createObjectURL(e.target.files[0]);
                e.target.value = "";

            }
        });


        let selectTool = (elem, tool) => {
            let checkbuttons = document.getElementsByClassName('check-button-normal');

            for (let i = 0; i < checkbuttons.length; i++) {
                if (checkbuttons[i].classList.contains('button-selected'))
                    checkbuttons[i].classList.remove('button-selected')
            }

            elem.classList.add("button-selected");
            instance.tool = tool;
        };

        document.getElementById('btnPan' + this.id).addEventListener("click", (e) => {
            this.editorCanvas.classList.remove("erase-tool");
            this.editorCanvas.classList.add("pan-tool");
            selectTool(e.currentTarget, new pantool(this.pdata));
        });

        document.getElementById('btnErase' + this.id).addEventListener("click", (e) => {
            this.editorCanvas.classList.remove("pan-tool");
            this.editorCanvas.classList.add("erase-tool");
            selectTool(e.currentTarget, new erasetool(this.pdata));
        });

        document.getElementById('btnUndo' + this.id).addEventListener("click", (e) => {
            if(this.indexactions >= 0 && this.actions.length > 0)
            {
                this.actions[this.indexactions].undo();
                this.indexactions--;
                this.updateDoUndoButtons();
            }
        });

        document.getElementById('btnDo' + this.id).addEventListener("click", (e) => {
            if(this.indexactions >= -1 && this.actions.length > 0 && this.indexactions < this.actions.length - 1)
            {
                this.indexactions++;
                this.actions[this.indexactions].do();
                this.updateDoUndoButtons();
            }
        });

        document.getElementById('btnExport' + this.id).addEventListener("click", (e) => {
            
            if(this.outputimage)
            {
                this.posProcessingImage().then((img) => {      

                    const link = document.createElement('a');
                    link.href = img.src;
                    link.download = 'export.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                                    
                }, (error) => {
                    console.error("Erro ao gerar a imagem de saída");
                    console.log(error)
                });  
            }
        });

        window.addEventListener("resize", function (e) {

            instance.editorCanvas.width = instance.editorCanvas.clientWidth;
            instance.editorCanvas.height = instance.editorCanvas.clientHeight;
            instance.outputCanvas.width = instance.outputCanvas.clientWidth;
            instance.outputCanvas.height = instance.outputCanvas.clientHeight;

            instance.centralizeImageOnCanvas();
            instance.paintAll();

        });     
        

        setTimeout(() => {
            
            if(ffteditor.api != null)
            {
                var img = new Image;
                img.onload = function () {
                    instance.setImage(img);
                }
                img.src = "palhaco.jpg";           
            }

        }, 1000);

    }

    static async initialize() {
        ffteditor.api = {
            get_version: Module.cwrap("get_version", "number", []),

            create_uchar_buffer: Module.cwrap("create_uchar_buffer", "number", ["number"]),
            destroy_uchar_buffer: Module.cwrap("destroy_buffer", "", ["number"]),
            create_double_buffer: Module.cwrap("create_double_buffer", "number", ["number"]),
            destroy_double_buffer: Module.cwrap("destroy_double_buffer", "", ["number"]),
            print_buffer: Module.cwrap("print_buffer", "", ["number", "number"]),

            fft_forward: Module.cwrap("fft_forward", "number", ["number", "number", "number", "number", "number"]),
            fft_backward: Module.cwrap("fft_backward", "number", ["number", "number", "number", "number", "number"]),
            fft_phase: Module.cwrap("fft_phase", "", ["number", "number", "number", "number", "number"]),
            fft_spectre: Module.cwrap("fft_spectre", "", ["number", "number", "number", "number", "number", "number"]),
        };
        console.log('FFTWasm Version:' + ffteditor.api.get_version());        
    }

    addCanvasEventListener(canvas) {
        canvas.onselectstart = function () { return false; }


        let mousedownfunc = (e) => {
            this.tool.onmousedown(e);
            this.paintAll();
        };

        let mousemovefunc = (e) => {
            this.tool.onmousemove(e);
            this.paintAll();
        };

        let mouseupfunc = (e) => {
            this.tool.onmouseup(e);
            this.paintAll();

            if (this.tool instanceof erasetool && this.fft_result) {
                if (this.pdata && this.pdata.erasedPoints.length > 0) {
                    
                    let erasedPoints = this.tool.getErasedPoints();
                    this.getErasedPixels().then((erasedPixels) => {                       

                        let action = new eraseraction(this, erasedPixels, erasedPoints);
                        this.addAction(action);                       
                    }, (error) => {
            
                        console.error("Erro ao gerar erasedPixels");
                        console.log(error);
                    });
                }
            }
        };

        let mouseoutfunc = (e) => {
            this.tool.onmouseout(e);
            this.paintAll();
        };


        canvas.addEventListener("mousedown", mousedownfunc);

        canvas.addEventListener("mouseup", mouseupfunc);

        canvas.addEventListener("mousemove", mousemovefunc);

        canvas.addEventListener("mouseout", mouseoutfunc);

        canvas.addEventListener("touchstart", (e) => {
            e.clientX = e.targetTouches[0].clientX;
            e.clientY = e.targetTouches[0].clientY;
            //mousedownfunc(e);
        });

        canvas.addEventListener("touchmove", (e) => {
            e.clientX = e.targetTouches[0].clientX;
            e.clientY = e.targetTouches[0].clientY;
            mousemovefunc(e);
            e.preventDefault();
        });

        canvas.addEventListener("touchend", (e) => {
            mouseupfunc(e);
        });

        canvas.addEventListener("touchcancel", (e) => {
            mouseoutfunc(e);
        });

    }

    getErasedPixels() {
        return new Promise((resolve, reject) => {

            try {
                let canvas = document.createElement('canvas');
                canvas.width = this.image.width;
                canvas.height = this.image.height;

                let ctx = canvas.getContext("2d");
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.beginPath();
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                if (this.pdata.erasedPoints.length > 0) {
                    //ctx.fillStyle = 'black';
                    ctx.fillStyle = "rgba(0, 0, 0, 1)";
                    for (let i = 0; i < this.pdata.erasedPoints.length; i++) {
                        ctx.beginPath();
                        ctx.arc(this.pdata.erasedPoints[i].x, this.pdata.erasedPoints[i].y, this.pdata.radiusErased, 0, 2 * Math.PI, false);
                        ctx.fill();
                    }
                }

                const outputImage = new Image();
                outputImage.addEventListener("load", () => {

                    this.getPixels(outputImage).then((pixels) => {

                        resolve(this.assemblyImageByQuadrantsUchar(pixels, outputImage.width, outputImage.height));

                    }, (error) => {
                        console.log(error);
                    });

                });
                outputImage.src = canvas.toDataURL();

            } catch (error) {
                reject(error);
            }
        });
    }

    assemblyImageByQuadrantsUchar(img, w, h) {
        let buffer = new Uint8Array(w * h);

        let wp = w / 2;
        let hp = h / 2;

        //________________
        //|       |       |
        //|    1  |   2   |
        //|       |       |
        //-----------------
        //|       |       |
        //|    3  |   4   |
        //|       |       |
        //-----------------

        // 1 troca com 4
        for (let i = 0; i < h / 2; i++) {
            for (let j = 0; j < w / 2; j++) {
                let index = (w * (i + hp)) + (j + wp);
                let index2 = w * i + j;
                buffer[index] = img[index2];
                buffer[index2] = img[index];
            }
        }

        //3 troca com 2
        for (let i = 0; i < h / 2; i++) {
            for (let j = 0; j < w / 2; j++) {
                let index = (w * (i + hp)) + j;
                let index2 = w * i + (j + wp);
                buffer[index2] = img[index];
                buffer[index] = img[index2];
            }
        }

        return buffer;
    }

    paintEditor() {
        if (this.spectre && this.editorCanvas && this.pdata) {
            let ctx = this.editorCanvas.getContext("2d");
            ctx.clearRect(0, 0, this.editorCanvas.width, this.editorCanvas.height);
            ctx.drawImage(this.spectre, this.pdata.tx, this.pdata.ty, this.spectre.width, this.spectre.height);


            if (this.pdata.erasedPoints.length > 0) {
                ctx.fillStyle = "rgba(0, 0, 0, 1)";
                //ctx.fillStyle = 'gray';
                for (let i = 0; i < this.pdata.erasedPoints.length; i++) {
                    ctx.beginPath();
                    ctx.arc(this.pdata.erasedPoints[i].x + this.pdata.tx, this.pdata.erasedPoints[i].y + this.pdata.ty, this.pdata.radiusErased, 0, 2 * Math.PI, false);
                    ctx.fill();
                }
            }
        }
    }

    paintOutput() {
        if (this.outputimage && this.pdata) {
            let ctx = this.outputCanvas.getContext("2d");
            ctx.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
            ctx.drawImage(this.outputimage, this.pdata.tx, this.pdata.ty, this.outputimage.width, this.outputimage.height);
        }
    }

    paintAll() {
        this.paintEditor();
        this.paintOutput();
    }

    preProcessingImage(img) {
        return new Promise((resolve, reject) => {

            if (img) {
                let side = img.width;
                const isSquare = img.width == img.height;

                if (!isSquare) {
                    side = img.width;
                    if (side < img.height)
                        side = img.height;
                }

                for (let i = 0; i < 100; i++) {
                    let multipleOfTwo = parseInt(Math.pow(2, i) + 0.5);
                    if (multipleOfTwo >= side) {
                        side = multipleOfTwo;
                        break;
                    }
                }

                let canvas = document.createElement('canvas');
                canvas.width = side;
                canvas.height = side;

                let ctx = canvas.getContext("2d");
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.beginPath();
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, (side - img.width) / 2, (side - img.height) / 2, img.width, img.height);

                const outputImage = new Image();
                outputImage.addEventListener("load", () => {
                    resolve(outputImage);
                });
                outputImage.src = canvas.toDataURL();
            }
            else {
                reject("Erro, a imagem não pode ser nula");
            }
        });
    }

    posProcessingImage()
    { 
        return new Promise((resolve, reject) => {
           
            if (this.originalimage) {

                if(this.outputimage)
                {
                    let canvas = document.createElement('canvas');
                    canvas.width = this.originalimage.width;
                    canvas.height = this.originalimage.height;

                    let ctx = canvas.getContext("2d");
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.beginPath();
                    ctx.fillStyle = "white";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    let recImage = {
                        "x" : (this.outputimage.width - this.originalimage.width) / 2.0,
                        "y" : (this.outputimage.height - this.originalimage.height) / 2.0,
                        "w" : this.originalimage.width,
                        "h" : this.originalimage.height
                    };

                    ctx.drawImage(this.outputimage, -recImage.x, -recImage.y);

                    const outputImage = new Image();
                    outputImage.addEventListener("load", () => {
                        resolve(outputImage);
                    });
                    outputImage.src = canvas.toDataURL();
                }
                else{
                    reject("Erro, a imagem de saída não pode ser nula");
                }
            }
            else {
                reject("Erro, a imagem não pode ser nula");
            }
        });
    }

    getPixels(inputImage) {
        return new Promise((resolve, reject) => {

            try {
                let offscreenCanvas = document.createElement("canvas");
                offscreenCanvas.width = inputImage.width;
                offscreenCanvas.height = inputImage.height;

                const ctx = offscreenCanvas.getContext("2d");
                ctx.drawImage(inputImage, 0, 0);

                const imageData = ctx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
                const data = imageData.data;

                const grayBuffer = new Uint8ClampedArray(data.length / 4);

                for (let i = 0; i < data.length; i += 4) {

                    //avg
                    if (data[i] == data[i + 1] && data[i] == data[i + 2])
                        grayBuffer[i / 4] = data[i];
                    else //bilinear
                        grayBuffer[i / 4] = (data[i] * 0.2126) + (data[i + 1] * 0.7152) + (data[i + 2] * 0.0722);

                }

                resolve(grayBuffer);

            } catch (error) {

                reject(error);
            }
        });
    }

    getImageFromPixels(pixels, width, height) {
        return new Promise((resolve, reject) => {

            try {

                if (width * height != pixels.length)
                    throw "Os pixels devem estar em escala de cinza";

                let offscreenCanvas = document.createElement("canvas");
                offscreenCanvas.width = width;
                offscreenCanvas.height = height;
                //document.body.appendChild(offscreenCanvas);

                const ctx = offscreenCanvas.getContext("2d");

                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, width, height);

                const blankImage = new Image(width, height);

                blankImage.addEventListener("load", () => {

                    let imageData = ctx.getImageData(0, 0, width, height);

                    for (let i = 0; i < imageData.data.length; i += 4) {

                        //bilinear
                        const pixelValue = pixels[i / 4];
                        imageData.data[i] = pixelValue; // red
                        imageData.data[i + 1] = pixelValue; // green
                        imageData.data[i + 2] = pixelValue; // blue
                    }

                    //imageData.data = data;
                    ctx.putImageData(imageData, 0, 0);

                    const outputImage = new Image();
                    outputImage.addEventListener("load", () => {
                        resolve(outputImage);
                    });
                    outputImage.src = offscreenCanvas.toDataURL();
                    //outputImage.src = offscreenCanvas.toDataURL("image/jpeg", 1.0);  
                });

                blankImage.src = offscreenCanvas.toDataURL();

            } catch (error) {

                reject(error);
            }
        });
    }

    fft_backward(real, imag, width, height) {
        return new Promise((resolve, reject) => {

            const ptr_real_part = ffteditor.api.create_double_buffer(width * height);
            const ptr_imag_part = ffteditor.api.create_double_buffer(width * height);

            //https://marcoselvatici.github.io/WASM_tutorial/
            Module.HEAPF64.set(real, ptr_real_part / real.BYTES_PER_ELEMENT);
            Module.HEAPF64.set(imag, ptr_imag_part / imag.BYTES_PER_ELEMENT);

            const ptr_output_img_backward = ffteditor.api.create_uchar_buffer(width * height);
            ffteditor.api.fft_backward(ptr_real_part, ptr_imag_part, ptr_output_img_backward, width, height);
            var pixels_backward = new Uint8Array(Module.HEAP8.buffer, ptr_output_img_backward, width * height);
            ffteditor.api.destroy_uchar_buffer(ptr_output_img_backward);

            ffteditor.api.destroy_double_buffer(ptr_real_part);
            ffteditor.api.destroy_double_buffer(ptr_imag_part);

            this.getImageFromPixels(pixels_backward, width, height).then(
                (outputImg) => {
                    resolve(outputImg);
                },
                (error) => {
                    console.error("Erro ao montar a imagem a partir dos pixels");
                    reject(error);
                });
        });
    }

    fft_forward(img) {
        return new Promise((resolve, reject) => {

            this.getPixels(img).then((pixels) => {
                if (pixels) {
                    const ptr_real_part = ffteditor.api.create_double_buffer(img.width * img.height);
                    const ptr_imag_part = ffteditor.api.create_double_buffer(img.width * img.height);

                    const ptr_img = ffteditor.api.create_uchar_buffer(img.width * img.height);
                    Module.HEAP8.set(pixels, ptr_img);
                    ffteditor.api.fft_forward(ptr_img, img.width, img.height, ptr_real_part, ptr_imag_part);
                    ffteditor.api.destroy_uchar_buffer(ptr_img);

                    var real_output_array = new Float64Array(Module.HEAPF64.buffer, ptr_real_part, img.width * img.height);
                    var imag_output_array = new Float64Array(Module.HEAPF64.buffer, ptr_imag_part, img.width * img.height);

                    const output_img_spectre = ffteditor.api.create_uchar_buffer(img.width * img.height);
                    const output_spectre = ffteditor.api.create_double_buffer(img.width * img.height);

                    ffteditor.api.fft_spectre(ptr_real_part, ptr_imag_part, output_spectre, output_img_spectre, img.width, img.height);
                    var pixels_spectre = new Uint8Array(Module.HEAP8.buffer, output_img_spectre, img.width * img.height);

                    ffteditor.api.destroy_double_buffer(output_img_spectre);
                    ffteditor.api.destroy_double_buffer(output_spectre);

                    ffteditor.api.destroy_double_buffer(ptr_real_part);
                    ffteditor.api.destroy_double_buffer(ptr_imag_part);

                    resolve({ "real": real_output_array, "imag": imag_output_array, "spectre_raw": pixels_spectre, "width": img.width, "height": img.height });
                }
                else {
                    reject("getPixels não retornou pixels válidos");
                }
            }, (error) => {
                console.error("Erro ao pegar os pixels da imagem");
                reject(error);
            });
        });


    }

    setImage(original) {
        this.originalimage = original;
        this.pdata = new paintdata();

        window.dispatchEvent(new Event('resize'));

        this.preProcessingImage(original).then((processedImage) => {
            this.image = processedImage;

            this.fft_forward(this.image).then((fft_result) => {
                this.fft_result = fft_result;
                this.getImageFromPixels(fft_result.spectre_raw, fft_result.width, fft_result.height).then(
                    (outputImg) => {
                        this.spectre = outputImg;
                        this.pdata.imageWidth = outputImg.width;
                        this.pdata.imageHeight = outputImg.height;
                        this.pdata.tx = (this.editorCanvas.width - outputImg.width) / 2;
                        this.pdata.ty = (this.editorCanvas.height - outputImg.height) / 2;
                        this.paintEditor();

                        this.fft_backward(fft_result.real, fft_result.imag, fft_result.width, fft_result.height).then((backward) => {
                            this.outputimage = backward;
                            this.paintOutput();
                            document.getElementById('btnExport' + this.id).classList.remove("button-disabled");
                        }, (error) => {
                            console.error("Erro ao fazer a fft inversa");
                            console.log(error);
                        });
                    }, (error) => {
                        console.error("Erro ao montar a imagem a partir do espectro");
                        console.log(error);
                    });
            }, (error) => {
                console.log(error);
            });

        }, (error) => {
            console.log(error);
        });
    }

    centralizeImageOnCanvas() {
        this.pdata.tx = (this.editorCanvas.width - this.pdata.imageWidth) / 2;
        this.pdata.ty = (this.editorCanvas.height - this.pdata.imageHeight) / 2;
        this.paintAll();

    }

    addAction(action)
    {
        while(this.indexactions < this.actions.length - 1)
            this.actions.pop();            

        this.actions.push(action);
        this.indexactions++;
        this.actions[this.indexactions].do();
        this.updateDoUndoButtons();
    }

    updateDoUndoButtons()
    {
        let btnDo = document.getElementById('btnDo' + this.id);
        let btnUndo = document.getElementById('btnUndo' + this.id);

        if(this.indexactions > -1)
            btnUndo.classList.remove("button-disabled");
        else
            btnUndo.classList.add("button-disabled");

        if(this.indexactions < this.actions.length - 1)
            btnDo.classList.remove("button-disabled");
        else
            btnDo.classList.add("button-disabled");
        
    }
}

Module.onRuntimeInitialized = ffteditor.initialize;
