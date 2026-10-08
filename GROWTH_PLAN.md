# Crecimiento técnico de DeadSingularity V1

Cada hito reduce el coste del siguiente. El motor sigue siendo `js/game.js` y
`js/engine/`, compartido por Windows, web y móvil, con módulos IIFE en `window.NV`.
La base de comparación es el juego completo, sus pruebas y sus hashes de entrega.
Estado actualizado: se implementaron las bases de los seis hitos. Ver
`docs/CRECIMIENTO_IMPLEMENTADO.md` para evidencia y pendientes de cierre.

Los hashes originales comprueban la preservación inicial. Al agregar contenido,
cada versión tendrá un manifiesto de entrega propio y pruebas de regresión del
comportamiento compartido; la referencia congelada mantiene sus bytes históricos.

## 1. Aislar módulos y cargar presentación a demanda

**Especificación:** inventariar dependencias y orden de los scripts; definir
facades pequeñas para input, simulación, render, audio y persistencia. Extraer
responsabilidades del coordinador por unidades sin cambiar sus fórmulas. Mantener
orden explícito de IIFE. Cargar galerías, paneles y recursos opcionales cuando se
abran; iniciar la simulación sólo después de tener sus dependencias. Retener audio
desbloqueado por gesto y un fallback visible si falla una carga opcional.

**Depende de:** entrega autónoma y pruebas actuales.
**Cierre:** misma partida y estado a igual semilla/entrada; inicio y memoria medidos
antes/después, sin cargas tardías que interrumpan combate ni módulos duplicados.
**Valor acumulado:** cambios locales y límites claros para introducir contenido.

## 2. Pipeline de contenido validado

**Especificación:** esquemas versionados para pilotos, armas, enemigos, sectores
y jefes: IDs estables, valores, comportamientos registrados y referencias de arte.
Validar tipos, rangos, referencias, duplicados, límites de entidades y compatibilidad
de guardados en CLI. Publicar datos como IIFE o JSON cargado antes de iniciar;
conservar un registro explícito de comportamientos del motor, sin ejecutar código
arbitrario proveniente de datos. Separar contenido/balance de preferencias visuales.

**Depende de:** 1.
**Cierre:** el catálogo actual produce el mismo comportamiento; un enemigo o arma
nuevos se agregan con datos y un comportamiento registrado, sin editar el loop.
**Valor acumulado:** ampliar contenido requiere menos cambios y pruebas más pequeñas.

## 3. CI sin interfaz y validación de entregas

**Especificación:** instalar dependencias desde lockfile; ejecutar tests de módulos
y datos, escenarios deterministas a distintas frecuencias y presupuesto de entidades.
Crear la build estática y probarla bajo subruta en Chromium: menú, partida, tienda,
guardar/cargar, controles, audio y errores. En Windows, construir NSIS y validar
app empaquetada, ASAR, recursos, perfil e icono. Guardar JSON, capturas y manifiestos.
Las preferencias gráficas se comparan con el mismo estado de simulación.

**Depende de:** 1 y 2. El remoto y la publicación se configuran a pedido del autor.
**Cierre:** falla la entrega ante contenido inválido, discrepancias de estado,
recursos ausentes o acceso a reference/; las credenciales de firma son secretos CI.
**Valor acumulado:** cada incorporación del catálogo recibe la misma protección.

## 4. API de extensiones con límites

**Especificación:** eventos documentados con versiones y payloads inmutables;
API para registrar contenido y comportamientos permitidos. Aplicar límites de
entidades, eventos por frame y recursos por paquete. Validar paquetes con el
pipeline del hito 2 y pruebas del 3. Guardados registran IDs y versión del catálogo.
Desactivar una extensión debe resolver contenido ausente sin corromper progreso.
Primera versión: extensiones de datos; scripts externos requieren otro diseño.

**Depende de:** 1–3.
**Cierre:** paquete de prueba instalable/desactivable, sin acceso a archivos,
red ni preferencias capaces de alterar estadísticas de la simulación.
**Valor acumulado:** contenido propio y extensiones comparten herramientas y contratos.

## 5. Android y render opcional WebGPU

**Especificación:** empaquetar los mismos archivos estáticos en un WebView Android
con contenedor nativo mínimo y origen estable para guardados. Validar táctil,
orientación, safe areas, pausa/retorno, audio y restauración de sesión en dispositivo.
WebGPU es un renderer opcional tras detección de capacidad; Canvas2D permanece
como fallback. Ambos consumen el mismo estado y mantienen tamaños/hitboxes;
la calidad visual no cambia daño, velocidad, dificultad ni temporizadores.

**Depende de:** 1–3; API del 4 útil para variantes de contenido.
**Cierre:** pruebas en teléfono real y web/escritorio; misma simulación a igual
entrada, pérdida/recuperación de contexto gráfico manejada y métricas de batería/FPS.
**Valor acumulado:** una corrección del motor beneficia a todas las plataformas.

## 6. Adaptador de servicios y operaciones en vivo

**Especificación:** interfaz `loadManifest`, `fetchCatalog`, `submitTelemetry` y
`syncProgress` con implementación local por defecto y stub determinista para CI.
El contrato define versión, compatibilidad, timeout, tamaño máximo, reintentos,
hashes de paquetes y rollback a catálogo conocido. Diseñar consentimiento para
telemetría y resolución explícita de conflictos de progreso antes de conectar red.
Los catálogos y paquetes remotos deberán tener firma verificada con una clave
pública confiable antes de activarlos; un hash aislado no acredita al publicador.
Activar backend real requiere elegir proveedor, autenticación y costes con el autor.
La app conserva partida offline; ninguna respuesta remota muta una oleada en curso.

**Depende de:** 2–5; distribución firmada y secretos provisionados para producción.
**Cierre:** stub prueba falta de red, respuestas corruptas, catálogo incompatible
y conflicto de saves sin pérdida de progreso. Luego se integra un servicio real.
**Valor acumulado:** catálogo, validación, extensiones y plataformas permiten publicar
contenido con el mismo proceso y con recuperación verificable.

## Orden de implementación

1 → 2 → 3 establece una base comprobable. 4 y 5 pueden avanzar por separado tras
esa base; 6 conecta sus contratos. En cada unidad: cambio acotado, comparación
de comportamiento, prueba de partida y registro de continuidad. La arquitectura
facilita crecer; el rendimiento y la velocidad de entrega se miden, no se prometen.
