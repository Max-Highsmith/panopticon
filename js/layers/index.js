/* ===================================================================
   PANOPTICON — Layer Barrel File
   Imports all data layer modules to trigger their self-registration
   with the layer registry. No exports — side-effect only.
   =================================================================== */

// Data layers (createDataLayer)
import './mines.js';
import './infrastructure.js';
import './militarybases.js';
import './arcticmining.js';
import './rareearth.js';
import './drillingleases.js';
import './powerplants.js';
import './nuclearplants.js';
import './refineries.js';
import './platforms.js';
import './radar.js';
import './strategicnuclear.js';
import './volcanoeslayer.js';
import './earthquakeslayer.js';
import './wildfireslayer.js';
import './spacedebrislayer.js';
import './spaceportslayer.js';
import './lightninglayer.js';
import './portslayer.js';
import './internetexchangeslayer.js';
import './oceantemplayer.js';
import './meteorlayer.js';
import './cosmiclayer.js';
import './ionospherelayer.js';
import './arcticdepositslayer.js';

// Path layers (createPathLayer)
import './cables.js';
import './pipelineslayer.js';
import './traderoutes.js';
import './arcticroutes.js';
import './electricalgrid.js';
import './whalelayer.js';
import './seaturtlelayer.js';
import './birdlayer.js';
import './elephantlayer.js';
import './oceancurrentslayer.js';
import './cargorouteslayer.js';
import './commodityflowslayer.js';

// Region layers (createRegionLayer)
import './chokepoints.js';
import './fisherieslayer.js';
import './seaicelayer.js';
import './fishingfleetslayer.js';

// Bespoke layers
import './airports.js';
import './webcams.js';
