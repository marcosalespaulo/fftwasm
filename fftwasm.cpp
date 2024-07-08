#include "emscripten.h"
#include <complex>
#include <thread>  
#include <chrono>
#include <iostream>
#include <stdlib.h> // required for malloc definition
#include <iomanip>


using namespace std;


#ifdef __cplusplus
#define EXTERN extern "C"
#else
#define EXTERN
#endif


inline static int Powerof2(int n,int *m,int *twopm)
{
	if (n <= 1)
	{
		*m = 0;
		*twopm = 1;
		return 0;
	}

	*m = 1;
	*twopm = 2;
	do
	{
		(*m)++;
		(*twopm) *= 2;
	} while (2*(*twopm) <= n);

	if (*twopm != n)
		return 0;
	else
		return 1;
}

// 0 f
// 1 b
inline static int FFT(int dir,int m,double *x,double *y)
{
	long nn,i,i1,j,k,i2,l,l1,l2;
	double c1,c2,tx,ty,t1,t2,u1,u2,z;

	// Calculate the number of points
	nn = 1;
	for (i=0;i<m;i++)
		nn *= 2;

	// Do the bit reversal
	i2 = nn >> 1;
	j = 0;
	for (i=0;i<nn-1;i++)
	{
		if (i < j)
		{
			tx = x[i];
			ty = y[i];
			x[i] = x[j];
			y[i] = y[j];
			x[j] = tx;
			y[j] = ty;
		}
		k = i2;
		while (k <= j)
		{
			j -= k;
			k >>= 1;
		}
		j += k;
	}

	// Compute the FFT
	c1 = -1.0;
	c2 = 0.0;
	l2 = 1;
	for (l=0;l<m;l++)
	{
		l1 = l2;
		l2 <<= 1;
		u1 = 1.0;
		u2 = 0.0;
		for (j=0;j<l1;j++)
		{
			for (i=j;i<nn;i+=l2)
			{
				i1 = i + l1;
				t1 = u1 * x[i1] - u2 * y[i1];
				t2 = u1 * y[i1] + u2 * x[i1];
				x[i1] = x[i] - t1;
				y[i1] = y[i] - t2;
				x[i] += t1;
				y[i] += t2;
			}
			z =  u1 * c1 - u2 * c2;
			u2 = u1 * c2 + u2 * c1;
			u1 = z;
		}

		c2 = sqrt((1.0 - c1) / 2.0);
		if (dir == 1)
			c2 = -c2;
		c1 = sqrt((1.0 + c1) / 2.0);
	}

	// Scaling for forward transform
	if (dir == 1)
	{
		for (i=0;i<nn;i++)
		{
			x[i] /= (double)nn;
			y[i] /= (double)nn;
		}
	}

	return 1;
}

inline static int FFT2D(double* re, double* im,int nx,int ny, int dir)
{
	int i = 0,j = 0;
	int m = 0,twopm = 0;
	double *real,*imag;

	// Transform the rows
	real = (double *)malloc(nx * sizeof(double));
	imag = (double *)malloc(nx * sizeof(double));
	if (real == NULL || imag == NULL)
		return 0;

	if (!Powerof2(nx,&m,&twopm) || twopm != nx)
		return 0;

	for (j=0; j<ny; j++)
	{
		for (i=0; i<nx; i++)
		{
			real[i] = re[i*nx+j];
			imag[i] = im[i*nx+j];
		}

		FFT(dir,m,real,imag);

		for (i=0;i<nx;i++)
		{
			re[i*nx+j] = real[i];
			im[i*nx+j] = imag[i];
		}
	}
	free(real);
	free(imag);

	// Transform the columns
	real = (double *)malloc(ny * sizeof(double));
	imag = (double *)malloc(ny * sizeof(double));

	if (real == NULL || imag == NULL)
		return 0;

	if (!Powerof2(ny,&m,&twopm) || twopm != ny)
		return 0;

	for (i=0;i<nx;i++)
	{
		for (j=0;j<ny;j++)
		{
			real[j] = re[i*nx+j];
			imag[j] = im[i*nx+j];
		}

		FFT(dir,m,real,imag);

		for (j=0;j<ny;j++)
		{
			re[i*nx+j] = real[j];
			im[i*nx+j] = imag[j];
		}
	}
	free(real);
	free(imag);


	return 1;
}


inline void normalizaBufferDouble2Uchar(double *bufferIn, unsigned char **bufferOut, int size, unsigned char maxNewRange)
{
    (*bufferOut) = new unsigned char[size];
    double max = bufferIn[0];
    double min = bufferIn[0];

    for(int i = 0 ; i < size ; i++)
    {
        if(max < bufferIn[i])
            max = bufferIn[i];

        if(min > bufferIn[i])
            min = bufferIn[i];
    }

    for(int i = 0 ; i < size ; i++)
    {
        (*bufferOut)[i] = (unsigned char)((maxNewRange / (max - min)) * (bufferIn[i] - min));
    }

}

void assemblyImageByQuadrantsUchar(unsigned char* img, int w, int h, unsigned char **imgOut)
{
	unsigned char* buffer = new unsigned char[w * h];

	//Array.Copy(img, buffer, img.Length);

	int wp = w / 2;
	int hp = h / 2;

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
	for (int i = 0; i < h / 2; i++)
	{
		for (int j = 0; j < w / 2; j++)
		{
			int index = (w * (i + hp)) + (j + wp);
			int index2 = w * i + j;
			buffer[index] = img[index2];
			buffer[index2] = img[index];
		}
	}

	//3 troca com 2
	for (int i = 0; i < h / 2; i++)
	{
		for (int j = 0; j < w / 2; j++)
		{
			int index = (w * (i + hp)) + j;
			int index2 = w * i + (j + wp);
			buffer[index2] = img[index];
			buffer[index] = img[index2];
		}
	}

	(*imgOut) = buffer;
}



int main()
{
    return 0;
}


EXTERN EMSCRIPTEN_KEEPALIVE double get_version() {
  return 0.1;
}

EXTERN EMSCRIPTEN_KEEPALIVE unsigned char* create_uchar_buffer(int size) {
  return (unsigned char*)malloc(size * sizeof(unsigned char));
}

EXTERN EMSCRIPTEN_KEEPALIVE void destroy_buffer(unsigned char* p) {
  free(p);
}


EXTERN EMSCRIPTEN_KEEPALIVE double* create_double_buffer(int size) {
  return (double*)malloc(size * sizeof(double));
}

EXTERN EMSCRIPTEN_KEEPALIVE
void destroy_double_buffer(double* p) {
  free(p);
}


EXTERN EMSCRIPTEN_KEEPALIVE void print_buffer(double* p, int size) {
  for(int i = 0; i < size ; i++)
      std::cout << p[i] << std::endl;
}


EXTERN EMSCRIPTEN_KEEPALIVE int fft_forward(unsigned char* img_in, int width, int height, double* real, double *imag)
{
  	const int size = width * height;
  	double *r = new double[size];
	double *i = new double[size];
	std::fill_n(i, size, 0);
  	std::fill_n(r, size, 0);

  	//std::cout << "Imagem cpp:" << (int)img_in[0] << " - " << (int)img_in[size - 1] << std::endl;

	for (int j = 0; j < size; j++)
	{
		r[j] = img_in[j];
	}

	int result = FFT2D(r, i, width, height, 0);	

	memcpy((real), r, size * sizeof(double));
	memcpy((imag), i, size * sizeof(double));

	delete [] r;
	delete [] i;

	//std::cout << "Real cpp:" << std::setprecision (15) << real[0] << " - " << std::setprecision (15) << real[size - 1] << std::endl;
	//std::cout << "Imaginaria cpp:" << std::setprecision (15) << imag[0] << " - " << std::setprecision (15) << imag[size - 1] << std::endl;

	return result;
}

EXTERN EMSCRIPTEN_KEEPALIVE int fft_backward(double *realBuffer, double *imgBuffer, unsigned char *buffer, int w, int h)
{
	double *r = new double[w * h];
	double *i = new double[w * h];

	memcpy(r, realBuffer, w * h * sizeof(double));
	memcpy(i, imgBuffer, w * h * sizeof(double));

	int result = FFT2D(r, i, w, h, 1);

	unsigned char *rawInverseRealOut = 0;
	normalizaBufferDouble2Uchar(r, &rawInverseRealOut, w * h, 255);
  	memcpy(buffer, rawInverseRealOut, w * h * sizeof(unsigned char));
  	delete [] rawInverseRealOut;

	delete[] r;
	delete[] i;

  	return result;
}


EXTERN EMSCRIPTEN_KEEPALIVE void fft_phase(double *realBuffer, double *imgBuffer, double *phase, unsigned char *phase_normalized, int sizeBuffer)
{	
	for (int i = 0; i < sizeBuffer; i++)
		phase[i] = atan(imgBuffer[i] / realBuffer[i]);

	unsigned char *raw = 0;
	normalizaBufferDouble2Uchar(phase, &raw, sizeBuffer, 255);
	memcpy(phase_normalized, raw, sizeBuffer * sizeof(unsigned char));
	delete [] raw;
}

EXTERN EMSCRIPTEN_KEEPALIVE void fft_spectre(double *realBuffer, double *imgBuffer, double *spectre, unsigned char *spectre_normalized, int width, int height)
{

  	int sizeBuffer = width * height;

	for (int i = 0; i < sizeBuffer; i++)
	{
		spectre[i] = log(1.0 + sqrt((realBuffer[i] * realBuffer[i]) + (imgBuffer[i] * imgBuffer[i])));
		//spectre[i] = sqrt((realBuffer[i] * realBuffer[i]) + (imgBuffer[i] * imgBuffer[i]));
	}

  	unsigned char *raw = 0;
	normalizaBufferDouble2Uchar(spectre, &raw, sizeBuffer, 255);

	unsigned char *imgOut = 0;
	assemblyImageByQuadrantsUchar(raw, width, height, &imgOut);

	memcpy(spectre_normalized, imgOut, sizeBuffer * sizeof(unsigned char));

	delete [] imgOut;
	delete [] raw;
}



