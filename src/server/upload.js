// src/server/upload.js
import multer from 'multer';
import mega from 'megajs';
import fs from 'fs';
import path from 'path';
import express from 'express';

const router = express.Router();

// Configurar multer para almacenar archivos subidos
const upload = multer({
  dest: 'uploads/', // Asegúrate de que esta carpeta exista
  limits: {
    fileSize: 10 * 1024 * 1024, // Limitar tamaño a 10 MB
  },
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
router.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    const storage = await initializeMegaStorage(); // Esperar a que se inicialice MEGA
    const { path: tempPath, originalname, size } = req.file; // Obtener el tamaño del archivo

    console.log('Tamaño del archivo:', size); // Imprimir tamaño del archivo

    // Subir el archivo a MEGA y especificar el tamaño
    const uploadStream = fs.createReadStream(tempPath).pipe(
      storage.upload(originalname, { size }) // Especificar el tamaño del archivo
    );

    uploadStream.on('end', () => {
      // Eliminar archivo temporal después de la carga
      fs.unlinkSync(tempPath);
      res.status(200).json({
        message: 'Archivo subido exitosamente!',
        fileName: originalname,
        fileSize: size, // Incluir el tamaño del archivo en la respuesta
      });
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

export default router;
