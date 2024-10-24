'use client'; // Esto permite que el componente se ejecute en el cliente

import { useState } from 'react';

export default function Home() {
    const [fileUrl, setFileUrl] = useState('');
    const [status, setStatus] = useState('');

    const handleDownload = async () => {
        if (!fileUrl) {
            setStatus('Por favor, ingresa una URL válida.');
            return;
        }

        setStatus('Iniciando descarga...');

        try {
            // Redirige directamente al backend para iniciar la descarga
            const downloadUrl = `http://localhost:5000/download?url=${encodeURIComponent(fileUrl)}`;
            window.location.href = downloadUrl;

            setStatus('Descarga iniciada.');
        } catch (error) {
            console.error('Error al iniciar la descarga:', error);
            setStatus('Error al iniciar la descarga.');
        }
    };

    return (
        <div>
            <h1>Descargar Archivo de MEGA</h1>
            <input
                type="text"
                placeholder="URL del archivo de MEGA"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
            />
            <button onClick={handleDownload}>Descargar</button>
            <div>{status}</div>
        </div>
    );
}
