# 📹 KAPTURA by Ethernium

> **CHRONO Capture Engine · Local-first browser studio**

KAPTURA conserva CHRONO como su motor de captura. Permite solicitar grabación
de pantalla o pestañas hasta 4K y 120 FPS con MediaRecorder; la resolución,
frecuencia y códec efectivos dependen del navegador, el sistema y la fuente.
El contenido permanece local y no requiere OBS ni plugins.

---

## ⚡ Características Principales

* **Captura 4K UHD solicitada**: objetivos de captura configurables según lo que soporte la fuente.
* **Pipeline de alta tasa de bits**: perfiles configurables hasta 100 Mbps.
* **Codecs de Siguiente Generación**: Soporte para VP9 High-Profile, AV1 y H.264 / AVC.
* **Captura de Audio Loopback Nativo**: Graba el audio del sistema/pestaña sincronizado sin pérdida.
* **Local-first**: la grabación y el Vault usan el navegador local; KAPTURA no sube el vídeo a un servidor.
* **Estética HUD Obsidian**: Interfaz futurista con vista previa en tiempo real y telemetría de tasa de transferencia.
* **UPSKALETOR integrado por frontera segura**: una pestaña conduce al motor
  independiente sin copiarlo ni fingir que el navegador puede ejecutar PowerShell.

## Motores independientes

- **KAPTURA / CHRONO** captura y conserva el master.
- **[UPSKALETOR-by-Ethernium](https://github.com/SteveBlackbeard/UPSKALETOR-by-Ethernium)**
  procesa el master mediante IA o Lanczos en su propio repositorio, instalador,
  CI y releases firmadas.

La pestaña UPSKALETOR realiza un traspaso explícito al operador. Esta separación
evita duplicar el motor y respeta la barrera de seguridad del navegador.

---

## 🚀 Uso Rápido

1. Abre `index.html` en cualquier navegador moderno (Chrome, Edge, Brave).
2. Haz clic en **🌐 SELECT SOURCE** y elige la pestaña o pantalla que deseas grabar.
3. Elige el objetivo de frame rate, bitrate y códec que soporte tu navegador.
4. Haz clic en **🔴 START RECORDING**.
5. Al finalizar, haz clic en **⏹️ STOP & SAVE 4K** para descargar el archivo `.webm` en calidad Master.
6. Para mejorar el master, abre la pestaña **UPSKALETOR** y continúa en el
   motor independiente.

---
<sub>Built with sovereignty by Ethernium Sovereign Agent Architecture — Nulla-Labs // Nemeth Corp.</sub>
