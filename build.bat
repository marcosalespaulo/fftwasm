:: emcc -O3 -s WASM=1 -s EXPORTED_RUNTIME_METHODS='["cwrap"]' .\fftwasm.cpp -o fftwasm.js
::call emcmdprompt.bat
emcc -O3 -std=c++11 -pthread -s WASM=1 -s ALLOW_MEMORY_GROWTH -s ALLOW_BLOCKING_ON_MAIN_THREAD=1  -s EXPORTED_RUNTIME_METHODS="['cwrap', 'getValue', 'setValue']" -s ASSERTIONS -s NO_EXIT_RUNTIME=1 -s PTHREAD_POOL_SIZE_STRICT=2 -s PTHREAD_POOL_SIZE=8 .\fftwasm.cpp -o fftwasm.js
