# Heladera, condimentado y tiempos de servicio

12/11/2026 · Rama de integración del equipo.

La heladera está a la derecha de la mesa del asador. Abrí o cerrá con **E** sobre las puertas o el cartel superior. Con la pinza (**3**) apuntá al corte y presioná **E** para sacarlo. Cada extracción repone en el acto una pieza fría, del mismo tipo y sin condimentos. Al terminar de comer sólo se retira lo que se sirvió.

Apoyá una pieza en la tabla con **E** o clic. Usá **E** sobre un frasco para seleccionar sal gruesa, chimichurri o salmuera. Mantené **clic izquierdo** y mové la mira por encima de la carne para aplicar el condimento. Los condimentos quedan en la pieza al retirarla.

Seleccioná el **cuchillo** con **E** y repetí el gesto para dividir un corte entero, crudo o cocido, en dos porciones iguales. Cada mitad conserva su espesor, las cinco temperaturas, las caras, la jugosidad y los condimentos. Volvé a la **pinza (3)** para recoger y servir cada mitad. La tabla admite un corte entero o sus dos mitades; cada mitad se puede cocinar y entregar por separado.

## Cómo evalúa una entrega

La evaluación lee el tipo de carne y su estado **al entregarla**. Una mitad cuenta como el mismo corte. Se rechaza la carne quemada, cruda o fría de heladera y el corte equivocado. Para los cortes vacunos, los rangos ideales de temperatura en el centro son 54–67,5 °C (jugoso), 66–75,5 °C (a punto) y 74–85 °C (bien cocido). Hasta 5 °C por debajo o por encima del rango, un corte correcto, jugoso y sin quemar recibe al menos una nota buena. El dorado y la jugosidad influyen en el puntaje. Estos umbrales se usan para el balance del juego.

En el chorizo cuenta el calor y el dorado de ambos lados. En la morcilla cuenta el recalentado. Una tripa tostada puede bajar la nota de un embutido. Si la tripa se daña gravemente o la carne se carboniza, el cliente rechaza el plato. La paciencia que queda aumenta puntos y propina en entregas buenas y excelentes. Si vence antes de la entrega, el cliente se va.

Una calificación regular aparece como **Aceptado** en la comanda, con el motivo de la observación. El cliente come, el pedido suma como atendido y se pierde la racha. La propina baja y puede ser cero.

## Tiempos del modelo

Prueba controlada desde 5 °C con flujo incidente constante de **4.000 W/m²** en todos los cortes, vuelta cada cinco minutos simulados y paso de 0,25 s. Tiempos de juego a **×6**, desde que la carne recibe calor:

| Corte | Objetivo en el centro | Primera entrega excelente | Paciencia del cliente |
| --- | ---: | ---: | ---: |
| Matambre | 68 °C en 6:16 | 5:41 | 10 min |
| Vacío | 68 °C en 15:58 | 14:33 | 20 min |
| Tira de asado | 68 °C en 11:23 | 10:22 | 15 min |
| Falda | 68 °C en 10:59 | 11:41 | 16 min |
| Chorizo | 71 °C en 13:56 | 11:03 | 17 min |
| Morcilla precocida | 60 °C en 10:30 | 7:38 | 14 min |

La columna de entrega mide el criterio del modo Clientes con pedido a punto, salvo falda bien cocida y morcilla recalentada. Ese criterio es distinto del objetivo estricto del diagnóstico, que además exige una ventana de dorado por cara. En partida, los tiempos varían con el reparto y agotamiento de brasas. El benchmark no representa tiempos de cocción de alimentos reales.

Con tres trozos de carbón y una carga de papel, la primera brasa madura a los 780,25 s simulados: antes cerca de **3:15 a ×4**, ahora cerca de **2:10 a ×6**. El papel dura 50 s de juego activo a ×6. La paciencia corre desde el pedido en tiempo activo sin multiplicar y se pausa con el juego.

## Validación

- Pruebas de evaluación en ambos límites del margen de 5 °C, aceptación de un pedido regular y cocción simulada de un chorizo desde tripa tostada hasta daño grave.
- Selección por rayos de los seis compartimentos, bloqueo con la puerta cerrada, extracción repetida del mismo tipo, arrastre para condimentar, conservación de masa y energía al dividir, y servicio de dos mitades del mismo matambre a dos clientes.
- Prueba de que la simulación y los cambios de modo no agregan combustible. Sólo se carga al apuntar directamente al depósito y pulsar E, o se devuelve una pieza existente con la pala.
- Vista 3D de prueba en navegador: arrastre para salar y cortar, separación visible de mitades y matambre repuesto en la heladera. El navegador integrado no permite capturar el mouse para probar la partida completa en primera persona.
