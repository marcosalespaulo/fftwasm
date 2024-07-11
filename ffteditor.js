class tool
{
    constructor(data) {
        this.pdata = data;
    }
    onmousedown(e){ throw "Not implemented"};
    onmouseup(e){ throw "Not implemented"};
    onmousemove(e){ throw "Not implemented"};
    onmouseout(e){ throw "Not implemented"};
}

class pantool extends tool
{
    constructor(data) {
        super(data);
        this.down = null;
    }

    onmousedown(e){ this.down = e;  };
    onmouseup(e){ this.down = null; };
    onmousemove(e)
    {
        if(this.down)
        {
            let dx = e.clientX - this.down.clientX;
            let dy = e.clientY - this.down.clientY;
            this.pdata.tx += dx;
            this.pdata.ty += dy;
            this.down = e;
        }
    };

    onmouseout(e){ this.down = null; };
}

class erasetool extends tool
{
    constructor(data) {
        super(data);
    }

    onmousedown(e){ console.log("erasetool:" + e)};
    onmouseup(e){ console.log("erasetool:" + e)};
    onmousemove(e){ console.log("erasetool:" + e)};
    onmouseout(e){ console.log("erasetool:" + e)};
}

class paintdata
{
    constructor() {
        this.tx = 0;
        this.ty = 0;
    }            
}

class ffteditor {

    static api = null;

    constructor() {

        this.id = 1;
        this.image = null;
        this.spectre = null;
        this.outputimage = null;

        this.pdata = new paintdata();
        this.tool = new pantool(this.pdata);

        const collection = document.querySelectorAll('[ffteditor]');

        for(let i = 0 ; i < collection.length ; i++)
        {
            this.id = collection[i].getAttribute('ffteditor');

            let table =
            '<table style="width: 100%;height: 600px;">'+
            '    <tr>'+
            '        <td>'+
            '            <canvas style="border:1px solid #000000;" id="fftEditorCanvas'+ this.id +'" width="512" height="512"></canvas>'+
            '        </td>'+
            '        <td>'+
            '            <canvas style="border:1px solid #000000;" id="fftOutputImage'+ this.id +'" width="512" height="512"></canvas>'+
            '        </td>'+
            '    </tr>'+
            '</table>';

            collection[i].innerHTML = table;
        }

        this.editorCanvas = document.getElementById('fftEditorCanvas'+ this.id);
        this.outputCanvas = document.getElementById('fftOutputImage'+ this.id);

        this.addCanvasEventListener(this.editorCanvas);
               
    }

    static async initialize()
    {
        ffteditor.api = {
            get_version: Module.cwrap("get_version", "number", []),

            create_uchar_buffer: Module.cwrap("create_uchar_buffer", "number", ["number"]),
            destroy_uchar_buffer: Module.cwrap("destroy_buffer", "", ["number"]),
            create_double_buffer: Module.cwrap("create_double_buffer", "number", ["number"]),
            destroy_double_buffer: Module.cwrap("destroy_double_buffer", "", ["number"]),
            print_buffer : Module.cwrap("print_buffer", "", ["number", "number"]),

            fft_forward: Module.cwrap("fft_forward", "number", ["number","number","number", "number", "number"]),
            fft_backward: Module.cwrap("fft_backward", "number", ["number","number","number", "number", "number"]),
            fft_phase: Module.cwrap("fft_phase", "", ["number","number","number", "number","number"]),
            fft_spectre: Module.cwrap("fft_spectre", "", ["number","number","number", "number", "number", "number"]),       
        };
        console.log('FFTWasm Version:'+ffteditor.api.get_version());
    }


    addCanvasEventListener(canvas)
    {
        canvas.onselectstart = function () { return false; }

        canvas.addEventListener("mousedown", (e) => 
        {
            this.tool.onmousedown(e);
            this.paint();
        });

        canvas.addEventListener("mouseup", (e) => 
        {
            //console.log(e);

            this.tool.onmouseup(e);
            this.paint();
        });

        canvas.addEventListener("mousemove", (e) => 
        {
            this.tool.onmousemove(e);
            this.paint();
        });

        canvas.addEventListener("mouseout", (e) => 
        {
            this.tool.onmouseout(e);
            this.paint();
        });

    }

    paint()
    {
        if(this.spectre && this.editorCanvas && this.pdata)
        {
            let ctx = this.editorCanvas.getContext("2d");
            ctx.clearRect(0, 0, this.editorCanvas.width, this.editorCanvas.height);
            ctx.drawImage(this.spectre, this.pdata.tx, this.pdata.ty, this.spectre.width, this.spectre.height);


            if(this.outputimage)
            {
                ctx = this.outputCanvas.getContext("2d");
                ctx.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
                ctx.drawImage(this.outputimage, this.pdata.tx, this.pdata.ty, this.outputimage.width, this.outputimage.height);
            }
        }
    }

    getPixels(inputImage)
    {
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
                    if(data[i] == data[i + 1] && data[i] == data[i + 2])
                        grayBuffer[i/4] = data[i];
                    else //bilinear
                        grayBuffer[i/4] = (data[i] * 0.2126) + (data[i + 1] * 0.7152) + (data[i + 2] * 0.0722);                    

                }

                resolve(grayBuffer);
                
            } catch (error) {
                
                reject(error);
            }            
        });
    }

    getImageFromPixels(pixels, width, height)
    {
        return new Promise((resolve, reject) => {
            
            try {     
                
                if(width * height != pixels.length)
                    throw "Os pixels devem estar em escala de cinza";
                
                let offscreenCanvas = document.createElement("canvas");
                offscreenCanvas.width = width;
                offscreenCanvas.height = height;    
                //document.body.appendChild(offscreenCanvas);

                const ctx = offscreenCanvas.getContext("2d");

                ctx.fillStyle = "white";
                ctx.fillRect(0,0,width, height);

                const blankImage = new Image(width, height);   

                blankImage.addEventListener("load", () => {

                    let imageData = ctx.getImageData(0, 0, width, height);

                    for (let i = 0; i < imageData.data.length; i += 4) {                   

                        //bilinear
                        const pixelValue = pixels[i/4];
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

    
    fft_backward(real, imag, width, height)
    {
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
            (outputImg) => 
            {
                resolve(outputImg);                
            },
            (error) => 
            {
                console.error("Erro ao montar a imagem a partir dos pixels");
                reject(error);
            });
        });
    }


    fft_forward(img)
    {
        return new Promise((resolve, reject) => {

            this.getPixels(img).then((pixels) =>
            {
                if(pixels)
                {
                    const ptr_real_part = ffteditor.api.create_double_buffer(img.width * img.height);                            
                    const ptr_imag_part = ffteditor.api.create_double_buffer(img.width * img.height);
    
                    const ptr_img = ffteditor.api.create_uchar_buffer(img.width * img.height);
                    Module.HEAP8.set(pixels, ptr_img);
                    ffteditor.api.fft_forward(ptr_img, img.width, img.height, ptr_real_part, ptr_imag_part );
                    ffteditor.api.destroy_uchar_buffer(ptr_img);
    
                    var real_output_array = new Float64Array(Module.HEAPF64.buffer, ptr_real_part, img.width * img.height);
                    var imag_output_array = new Float64Array(Module.HEAPF64.buffer, ptr_imag_part, img.width * img.height);
    
                    const output_img_spectre = ffteditor.api.create_uchar_buffer(img.width * img.height);
                    const output_spectre = ffteditor.api.create_double_buffer(img.width * img.height);
    
                    ffteditor.api.fft_spectre(ptr_real_part, ptr_imag_part, output_spectre, output_img_spectre, img.width , img.height);
                    var pixels_spectre = new Uint8Array(Module.HEAP8.buffer, output_img_spectre, img.width * img.height);
    
                    ffteditor.api.destroy_double_buffer(output_img_spectre);
                    ffteditor.api.destroy_double_buffer(output_spectre);
    
                    ffteditor.api.destroy_double_buffer(ptr_real_part);
                    ffteditor.api.destroy_double_buffer(ptr_imag_part);
    
                    resolve({ "real" :real_output_array, "imag" : imag_output_array, "spectre_raw" : pixels_spectre, "width" : img.width, "height" : img.height });                   
       
    
    
                    // const ptr_output_img_backward = ffteditor.api.create_uchar_buffer(img.width * img.height);
                    // ffteditor.api.fft_backward(ptr_real_part, ptr_imag_part, ptr_output_img_backward, img.width, img.height);
                    // var pixels_backward = new Uint8Array(Module.HEAP8.buffer, ptr_output_img_backward, img.width * img.height);
                    // ffteditor.api.destroy_uchar_buffer(ptr_output_img_backward);
    
    
                    // this.getImageFromPixels(pixels_backward, img.width, img.height).then(
                    // (outputImg) => 
                    // {
                    //     this.setCanvasImage(this.outputCanvas, outputImg);
                    // },
                    // (error) => 
                    // {
                    //     console.error("Erro ao montar a imagem a partir dos pixels");
                    //     console.log(error);                     
                    // });
    
                    
                }
                else
                {
                    reject("getPixels não retornou pixels válidos");
                }
            },
            (error) => 
            {
                console.error("Erro ao pegar os pixels da imagem");
                reject(error);
            }); 
        });

            
    }

    setImage(img)
    {
        this.image = img;

        this.fft_forward(img).then((fft_result) => 
        {
            this.getImageFromPixels(fft_result.spectre_raw, fft_result.width, fft_result.height).then(
            (outputImg) => 
            {
                this.spectre = outputImg;
                this.pdata.tx = (this.editorCanvas.width - outputImg.width) / 2;
                this.pdata.ty = (this.editorCanvas.height - outputImg.height) / 2;

                this.fft_backward(fft_result.real, fft_result.imag, fft_result.width, fft_result.height).then((backward) => 
                {
                    this.outputimage = backward;
                    this.paint();
                },
                (error) => 
                {
                    console.error("Erro ao fazer a fft inversa");
                    console.log(error);                     
                });
            },
            (error) => 
            {
                console.error("Erro ao montar a imagem a partir do espectro");
                console.log(error);                     
            }); 
        }, 
        (error) => 
        {
            console.log(error);                     
        });
    }
}

Module.onRuntimeInitialized = ffteditor.initialize;
