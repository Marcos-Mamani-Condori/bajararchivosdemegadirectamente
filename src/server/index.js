const express = require('express');
const megajs = require('megajs');
const cors = require('cors');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

const app = express();
const PORT = 5000; // Puerto del backend

app.use(cors());

// Endpoint para descargar el archivo
app.get('/download', async (req, res) => {
    const fileUrl = req.query.url; // URL del archivo a descargar

    if (!fileUrl) {
        console.error('Error: URL is required');
        return res.status(400).send('URL is required');
    }

    try {
        console.log(`Iniciando descarga para la URL: ${fileUrl}`);

        // Aumentar el tiempo de espera y los intentos de reconexión
        const file = megajs.File.fromURL(fileUrl, { maxRetry: 5, timeout: 30000 }); // 30 segundos de timeout, 5 reintentos
        await file.loadAttributes();
        
        console.log(`Archivo encontrado: ${file.name} - Tamaño: ${file.size} bytes`);

        const stream = file.download();
        const fileName = file.name; // Obtener el nombre del archivo

        // Establecer las cabeceras para la descarga
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/octet-stream');

        // Transmitir el archivo directamente al cliente
        stream.pipe(res);

        stream.on('end', () => {
            console.log('Archivo enviado exitosamente.');
        });

        stream.on('error', (error) => {
            console.error('Error al transmitir el archivo:', error);
            res.status(500).send('Error downloading file');
        });

    } catch (error) {
        if (error.code === 'UND_ERR_CONNECT_TIMEOUT') {
            console.error('Error: Conexión agotada al intentar descargar el archivo:', error);
            res.status(504).send('Error: Timeout al conectarse a MEGA');
        } else {
            console.error('Error general en la descarga del archivo:', error);
            res.status(500).send('Error processing the file');
        }
    }
});

// Manejar las rutas de Next.js
app.all('*', (req, res) => {
    return handle(req, res); 
});

// Iniciar la aplicación Next.js
nextApp.prepare().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor Express y Next.js corriendo en http://localhost:${PORT}`);
    });
}).catch((error) => {
    console.error('Error al iniciar el servidor Next.js:', error);
});
