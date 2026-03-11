/* ===================================================================
   PANOPTICON — Layer Barrel File
   Imports all data layer modules to trigger their self-registration
   with the layer registry. No exports — side-effect only.
   =================================================================== */

// Critical minerals layers
import './lithiumlayer.js';
import './cobaltlayer.js';
import './nickellayer.js';
import './graphitelayer.js';
import './manganeselayer.js';
import './vanadiumlayer.js';
import './reelightlayer.js';
import './reehavylayer.js';
import './copperlayer.js';
import './bauxitelayer.js';
import './siliconlayer.js';
import './tinlayer.js';
import './galliumlayer.js';
import './germaniumlayer.js';
import './indiumlayer.js';
import './tantalumlayer.js';
import './niobiumlayer.js';
import './tungstenlayer.js';
import './titaniumlayer.js';
import './berylliumlayer.js';
import './chromiumlayer.js';
import './antimonylayer.js';
import './platinumlayer.js';
import './palladiumlayer.js';
import './uraniumlayer.js';
import './telluriumlayer.js';
import './fluorsparlayer.js';
import './magnesiumlayer.js';
import './zinclayer.js';
import './phosphatelayer.js';
import './iridiumlayer.js';
import './rhodiumlayer.js';
import './molybdenumlayer.js';
import './zirconiumlayer.js';
import './hafniumlayer.js';
import './seleniumlayer.js';
import './bismuthlayer.js';
import './cadmiumlayer.js';
import './silverlayer.js';
import './scandiumlayer.js';

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
import './underwatercams.js';

// Ambient layers
import './kalshilayer.js';
import './cryptolayer.js';
import './commoditieslayer.js';
import './newslayer.js';
import './whalebtclayer.js';
import './wikipedialayer.js';
import './profileslayer.js';
import './headsofstatelayer.js';

// Scenario-specific ambient layers
import './kalshiscenario.js';

// Dynamic ambient layers (data pushed via update(), not fetched)
import './walletlayer.js';
import './diplomatlayer.js';
