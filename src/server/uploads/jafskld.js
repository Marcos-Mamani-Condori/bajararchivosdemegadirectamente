require('dotenv').config(); // Cargar las variables de entorno desde el .env en la raíz del proyecto
const express = require('express');
const multer = require('multer');
const mega = require('megajs');
const cors = require('cors');
const fs = require('fs');
const next = require('next');
const path = require('path'); // Importar el módulo 'path' para manejar extensiones de archivos

const dev = process.env.NODE_ENV !== 'production'; // Determinar el modo de desarrollo
const nextApp = next({ dev }); // Inicializar Next.js
const handle = nextApp.getRequestHandler(); // Obtener el manejador de solicitudes de Next.js

const app = express();
const PORT = 3001; // Puerto para el servidor Express

// Configurar CORS para permitir solicitudes desde el frontend
app.use(cors());

// Configurar multer para almacenar temporalmente los archivos subidos y verificar tipos
const upload = multer({
  dest: 'uploads/', // Asegúrate de que esta carpeta exista
  fileFilter: (req, file, cb) => {
    const filetypes = /mp3|wav|ogg/; // Tipos de archivos permitidos
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    console.log('MIME Type:', file.mimetype);
    console.log('File Extension:', path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Error: Archivo no permitido. Solo se permiten archivos de audio.'));
  },
});

// Obtener las credenciales de MEGA desde las variables de entorno
const { MEGA_EMAIL, MEGA_PASSWORD } = process.env;

// Verificar si las variables de entorno están correctamente cargadas
if (!MEGA_EMAIL || !MEGA_PASSWORD) {
  console.error('Las credenciales de MEGA no están configuradas correctamente.');
  process.exit(1);
}

// Inicializar la conexión a MEGA de forma asíncrona
const initializeMegaStorage = async () => {
  return new Promise((resolve, reject) => {
    const storage = new mega.Storage({
      email: MEGA_EMAIL,
      password: MEGA_PASSWORD,
      autoload: true,
      keepalive: true,
    });

    storage.on('ready', () => {
      console.log('Autenticación en MEGA completada');
      resolve(storage);
    });

    storage.on('error', (err) => {
      console.error('Error de autenticación en MEGA:', err);
      reject(err);
    });
  });
};

// Ruta para subir archivos
app.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    const storage = await initializeMegaStorage(); // Esperar a que se inicialice MEGA
    const { path: tempPath, originalname } = req.file;

    // Subir el archivo a MEGA
    const uploadStream = fs.createReadStream(tempPath).pipe(
      storage.upload(originalname)
    );

    uploadStream.on('end', () => {
      // Eliminar archivo temporal después de la carga
      fs.unlinkSync(tempPath);
      res.status(200).json({ message: 'Archivo subido exitosamente!' });
    });

    uploadStream.on('error', (error) => {
      console.error('Error al subir a MEGA:', error);
      res.status(500).json({ error: 'Error al subir el archivo' });
    });
  } catch (error) {
    console.error('Error al iniciar sesión en MEGA:', error);
    res.status(500).json({ error: 'Error al iniciar sesión en MEGA' });
  }
});

// Manejador de solicitudes para Next.js
app.all('*', (req, res) => {
  return handle(req, res); // Delega la solicitud a Next.js
});

// Iniciar Next.js y el servidor
nextApp.prepare().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}).catch((error) => {
  console.error('Error al iniciar el servidor Next.js:', error);
  process.exit(1);
});
