# SSL Certificates

Para producción con HTTPS, coloca aquí:
- fullchain.pem   → certificado + cadena completa
- privkey.pem     → clave privada

## Opción A: Let's Encrypt (recomendado, gratis)
```bash
# Instalar certbot en el VPS
sudo apt install certbot
sudo certbot certonly --standalone -d TU_DOMINIO.COM

# Los archivos quedan en:
# /etc/letsencrypt/live/TU_DOMINIO.COM/fullchain.pem
# /etc/letsencrypt/live/TU_DOMINIO.COM/privkey.pem

# Copiar a esta carpeta:
cp /etc/letsencrypt/live/TU_DOMINIO.COM/fullchain.pem deploy/ssl/
cp /etc/letsencrypt/live/TU_DOMINIO.COM/privkey.pem deploy/ssl/
```

## Opción B: Railway / Fly.io
Estos servicios gestionan SSL automáticamente.
No necesitas esta carpeta — el nginx es solo para deploy en VPS propio.
