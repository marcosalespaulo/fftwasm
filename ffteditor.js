class ffteditor {
    constructor() {
               
    }

    static api = null;

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
                    //bilinear
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

    setImage(img)
    {
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

                //api.destroy_double_buffer(ptr_real_part);
                //api.destroy_double_buffer(ptr_imag_part);

                // const output_img = api.create_buffer(img.width, img.height);
                // api.fft_backward(ptr_real_part, ptr_imag_part, output_img, img.width, img.height);
                // var pixels_backward = new Uint8Array(Module.HEAP8.buffer, output_img, img.width * img.height);

                // getImageFromPixels(pixels_backward, img.width, img.height).then(
                // (outputImg) => 
                // {
                //     document.body.appendChild(outputImg);
                // },
                // (error) => 
                // {
                //     console.error("Erro ao montar a imagem a partir dos pixels");
                //     console.log(error);                     
                // });

                const output_img = ffteditor.api.create_uchar_buffer(img.width * img.height);
                const output_spectre = ffteditor.api.create_double_buffer(img.width * img.height);

                ffteditor.api.fft_spectre(ptr_real_part, ptr_imag_part, output_spectre, output_img, img.width , img.height);
                var pixels_spectre = new Uint8Array(Module.HEAP8.buffer, output_img, img.width * img.height);

                ffteditor.api.destroy_double_buffer(output_img);
                ffteditor.api.destroy_double_buffer(output_spectre);

                this.getImageFromPixels(pixels_spectre, img.width, img.height).then(
                (outputImg) => 
                {
                    this.setCanvasImage('fftEditorCanvas', outputImg);
                    //document.body.appendChild(outputImg);
                },
                (error) => 
                {
                    console.error("Erro ao montar a imagem a partir do escpectro");
                    console.log(error);                     
                });
            }
        },
        (error) => 
        {
            console.error("Erro ao pegar os pixels da imagem");
            console.log(error);                     
        });        
    }

    setCanvasImage(canvasId, img)
    {
        let canvas = document.getElementById(canvasId);
        if(canvas)
        {
            let ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
        }
        else
            throw "Nenhum canvas encontrado com o id:" + canvasId;
    }


}

Module.onRuntimeInitialized = ffteditor.initialize;
