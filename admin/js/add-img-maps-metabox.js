﻿var addImgMapsClosure = function($) {
	'use strict';
	
	var pluginName = "addimgmaps";
	var HANDLE_SIZES = false; // Needs to be in root file? Not used at present.
	var size_dimensions = { };

	/**
	 * Gets the attachment width for that imageSize.
	 *
	 * @since      1.0
	 * @access     private
	 * @param {string}   [var=full] which Wordpress size of the image (eg "full", "thumbnail")
	 * @returns {int} width in pixels
	 */	
	function getAttachmentWidth( imageSize ) {
		if ( ! imageSize ) {
			imageSize = 'full';
		}
		return size_dimensions[imageSize].width;
	}

	/**
	 * Gets the attachment height for that imageSize.
	 *
	 * @since      1.0
	 * @access     private
	 * @param {string}   [var=full] which Wordpress size of the image (eg "full", "thumbnail")
	 * @returns {int} width in pixels
	 */	
	function getAttachmentHeight( imageSize ) {
		if ( ! imageSize ) {
			imageSize = 'full';
		}
		return size_dimensions[imageSize].height;
	}
	
	/**
	 * Tells Init functions whether the client can run this.
	 *
	 * Only requirement is support for the "number" input type (absent in IE<9)
	 *
	 * @since      1.0
	 * @access     private
	 * @returns {boool}		True or False
	 */		
	function dependenciesSatisfied(  ) {
		/* Check that we can actually do this */
		var test = document.createElement("input");
		test.type="number";
		return ( test.type==="number");
	}

	/**
	 * Initialises the metabox.
	 *
	 * @since      1.0
	 * @access     public
	 * @returns   {none}
	 */			
	function init( ){
		// Fail gracefully
		if ( ! dependenciesSatisfied ) {
			$( '#' + pluginName + '-metabox > .inside').get().innerHTML(
				__('Please upgrade your browser to one that supports HTML5 to use the editing aspects of this plugin','add-img-maps')
			);
			return;
		}
			
		// Put the canvas over the image	
		var jQ_attachmentImage = $( '.wp_attachment_image img');
		console.assert(jQ_attachmentImage.length == 1, 'Problem with jQ_attachmentImage');
		
		var canvasElement = document.getElementById( pluginName + '-canvas' );
		
		// Move the canvas element to be next to the image in the DOM
		jQ_attachmentImage.get(0).parentElement.appendChild( canvasElement );
		
		// Give it the same dimensions
		canvasElement.width = jQ_attachmentImage[0].width;
		canvasElement.height = jQ_attachmentImage[0].height;
		/* Although the img element itself has no margin, its parent <P> element does, 
		 * and so I move the canvasElement down by as many pixels as the <P> top offset to compensate.
		 */
		canvasElement.style.top = jQ_attachmentImage[0].parentElement.offsetTop + 'px';
		
		/*
		 * Import the size_dimensions hash.
		 */
		 size_dimensions = $('#addimgmaps-ctrlmaps').data('size_dimensions');
		 console.assert( typeof (size_dimensions) == 'object', size_dimensions, typeof(size_dimensions) );
		
		
		// Initialise any 'create map' buttons
		var createMapButtons = $( '#' + pluginName + '-cr' );
		createMapButtons.click( function() {
			var image_size;
			if ( $(this).data('imagesize') ) {
				image_size = $(this).data('imagesize');
			} else {
				// In version 1.1, will also be able to handle a pulldown list.
				throw "Cannot find imagesize data attribute.";
			}
			setupMap( image_size ); //Do I pass the target?
			//This button will be hidden as part of the *-ctrl div, not individually.
			//$(this).hide();
		});
		
		// Initialise any 'edit map' buttons.
		var editMapButtons = $( '.' + pluginName + '-ed' ); //ID includes size
		editMapButtons.click( function() {
			var image_size = $(this).data('imagesize');
/*			var fieldSet = $( 'fieldset#' + pluginName + '-' + image_size );
			var JSON_map = fieldSet.data('map');
			// NB also extract from data-map & Pass 
			alert('TODO implement edit');
*/			console.assert( image_size );
			//setupMap will open either new or saved map & call openEditMap to make visible.
			setupMap ( image_size ); 
		} );
	}
	
   /**
	 * Hides the control panel, unhides the editing area, dims the image, &c.
	 *
	 * Other maintenance includes removing the 'unchanged' flag, if it exists, 
	 * and redrawing the map.
	 * 
	 * @since      1.0
	 * @access    private
	 * @returns {none}		
	 */		
	
	function openEditMap ( imageSize ) {
		$('#addimgmaps-ctrlmaps').hide();

		//Grey the main image out a little; as another cue about imagemap being edited.
		$( 'img.thumbnail' )[0].style.opacity = 0.6; 

		// Show addimgmaps-<size> fieldset
		var jQ_thisFieldSet = $( 'fieldset#addimgmaps-' + imageSize );
		jQ_thisFieldSet.show();
		drawImageMap( jQ_thisFieldSet.get(0) );

		// Unset 'unchanged' flag (if any)
		$( '#' + pluginName + '-' + imageSize + '-unchanged').val(0);
		
		// ensure the Canvas is visible
		$( 'canvas#addimgmaps-canvas' ).show();
	}

   /**
	 * Unhides the control panel, hides the editing area, restores the image.
	 *
	 * @since      1.0
	 * @access    private
	 * @returns {none}		
	 */		
	
	function closeEditMap( imageSize ) {
		// Show the control panel
		$('#addimgmaps-ctrlmaps').show();
		// Hide addimgmaps-<size> fieldset
		$( 'fieldset#addimgmaps-' + imageSize ).hide();
		// Restore the main image.
		$( 'img.thumbnail' )[0].style.opacity = 1.0; 
		//And hide the canvas
		$( 'canvas#addimgmaps-canvas' ).hide();
	}

	
	
	/**
	 * Initialises the editing area for one size within the metadata box for the plugin.
	 *
	 * Sets up the canvas, initialises event listeners, optionally draws shape.
	 *
	 * @since      1.0
	 * @access     private
	 * @param {string}   [var=full] which Wordpress size (eg "full", "thumbnail") to open
	 * @returns {int} width in pixels
	 */		
	function setupMap( imageSize ) {

		// Find Metabox element for imageSize - part of mapInit
		var mapForImageSize = $( 'fieldset#' + pluginName + "-" + imageSize ).get(0);
		// Check that it's a fieldset
		console.assert( typeof (mapForImageSize) == 'object', 'Failed to get element ' + pluginName + '-' + imageSize );
		console.assert( mapForImageSize.tagName == "FIELDSET", mapForImageSize);

		var savedMap = false;
		
		// Are we loading an existing map?
		if ( mapForImageSize.hasAttribute('data-map') ) {
			savedMap = JSON.parse( mapForImageSize.getAttribute('data-map') );
			console.log ( 'Extracted JSON object:' . savedMap );
		}

		// And the remove Map button
		var rmMapButton = $('<A/>', {
			'id': pluginName + "-" + imageSize + "-rm",
			'class': 'button-secondary addimgmaps-rm dashicons-before dashicons-trash',
			'text' : ' Delete whole map',
			'href' : '#',
			'click' : function() {
				/**
			     * (Closure) Wipes editing area & sets 'rm' flag.
				 *
				 * @Listens Click on 'delete map' button.
				 */

				 /* Delete the image map */				
				$('fieldset#addimgmaps-' + imageSize).empty();
				
				/* set 'rm' flag (unless this is a new map, in which it
				 * neither matters nor exists. */
				$( '[name=' + pluginName + '-' + imageSize + '-rm]' ).val(1);
				closeEditMap (imageSize);
				/* Expected to return -ed button to suggestion you create a new map; or cancel the deletion? */
				$( 'a#' + pluginName + '-' + imageSize + '-ed' ).text(
						'Cancel deletion & re-open "' + imageSize + '" map' );
						
				}
			}
				
		);
		
		// NOT CURRENTLY INCLUDED - NO USER CASE
		// (will be used to switch between maps)
		var closeMapButton = $('<A/>', {
			'id': pluginName + "-" + imageSize + "-close",
			'class': 'button-secondary addimgmaps-close dashicons-before dashicons-admin-collapse',
			'text' : 'Pause editing',
			'href' : '#',
			'click' : function() {
				/**
				 * (Closure) to freeze the edit. Will need to change button.
				 *
				 * @Listens Click on 'stop editing' button.
				 */
				/* There are state changes to addimgmaps-ctrlmaps
				 * - either a "no map" has become "unsaved new map"
				 *		- or existing map has "unsaved changes"
				 *	
				 * (A deletion is modelled as a different state entirely.)
				 */

				 // Show control panel, modified
				$( 'a#' + pluginName + '-' + imageSize + '-ed' ).text(
						'Resume editing map for size "' + imageSize + '"' );
				closeEditMap(imageSize);

				}
			}
				
		);

		var cancelMapButton = $('<A/>', {
			'id': pluginName + "-" + imageSize + "-close",
			'class': 'button-secondary addimgmaps-close dashicons-before dashicons-undo',
			'text' : ' Cancel',
			'href' : '#',
			'click' : function() {
				/**
				 * (Closure) to cancel the edit. 
				 * @Listens Click on 'stop editing' button.
				 */
				/* There are state changes to addimgmaps-ctrlmaps
				 * - either a "no map" has become "unsaved new map"
				 *		- or existing map has "unsaved changes"
				 *		- or existing map has an "unsaved deletion"
				 */
				 

				 /* Delete the image map */				
				$('fieldset#addimgmaps-' + imageSize).empty();
				
				/* set 'unchanged' flag (unless this is a new map, in which it
				 * neither matters nor exists. */
				$( '#' + pluginName + '-' + imageSize + '-unchanged').val(1);
				closeEditMap (imageSize);
								
				}
			}
				
		);
		
		
		
		
		// NB - MUST CHANGE TO CREATE AP?
		// CF: Create Map ID is "#addimgmaps-cr" with a value of the imageSize
		var createAreaButton = $("<A/>", {
			'id': pluginName + "-" + imageSize + "-cr",
			'class': 'button-secondary addimgmaps-area-cr dashicons-before dashicons-plus-alt',
			'text' : ' Add new area',
			'href' : '#',
			'click' : function() {
				/**
				 * (closure handles event) Add form fields for new area & redraw the canvas.
				 * 
				 * @Listens Click on the "add area" button
				 */
					var newArea = createAreaBox( imageSize , nextChildIdNum( mapForImageSize ) ); 
					mapForImageSize.appendChild( newArea );
					drawImageMap( mapForImageSize );
				}
			}
		);
		
		//Append the buttons
		$(mapForImageSize).append( rmMapButton, ' ', cancelMapButton, ' ', createAreaButton, ' ');
		
		if ( savedMap ) {
			var numAreas = savedMap.areas.length;
			for ( var i = 0; i< numAreas; i++ ) {
				var area = createAreaBox( imageSize, i, savedMap.areas[i]);	
				$(mapForImageSize).append(area);
			}
		} else {
			// New Area box		
			var firstArea = createAreaBox(imageSize, 0 , "rect");
			$(mapForImageSize).append( firstArea );
		}
		
		openEditMap ( imageSize );
		//Remember, it started hidden
		//$( mapForImageSize ).show();
		// The addimgmaps-ctrlmaps box should now be disabled
		//$('#addimgmaps-ctrlmaps').hide();
		
		
		// This is a JScript event, not a JQuery one.
		mapForImageSize.addEventListener("change", drawImageMap);
	}	
	
	/**
	 * Create a div object with the input forms representing a single clickable area
	 *
	 * @since      1.0
	 * @access     private
	 * @see						createShapeSelect
	 * @see						createCoordForRect, createCoordForCircle, appendCoordForPoly
	 * @param      {string}   imageSize  which Wordpress size of the image (eg "full", "thumbnail")
	 * @param      {int}      areaIndex  which area we are creating
	 * @param      {string}   [shape]    the shape of the clickable area (default: 'rect')
	 * @returns    {object}	A DIV element containing the input forms for that clickable area
	 */	
	function createAreaBox( imageSize, areaIndex, areaObj ) {
		// Catch an issue
		console.assert ( imageSize == "full", "Image expected to be full, instead was ", imageSize); 
		
		var shape;
		// shape defaults to 'rect'; 
		if ( !areaObj ) {
			shape ="rect";
		} else if ( typeof areaObj == 'string' ) {
			shape = areaObj;
			areaObj = null;
		} else {
			// Existing area 
			shape = areaObj.shape;
		}

		console.assert ( shape=="rect"|| shape=="circle"||shape=="poly", "Invalid shape ", shape);

		var metaBoxForImageSize = $( 'fieldset#' + pluginName + "-" + imageSize ).get(0);
		console.assert( metaBoxForImageSize );
		
		var newArea = document.createElement("div");
		var newAreaId = pluginName + "-" + imageSize + "-" + areaIndex;
		newArea.id = newAreaId;
		newArea.className = pluginName + "-area";
		newArea.appendChild( 
			createShapeSelect( newArea.id, shape ) 
		);

		var deleteButton = document.createElement("a");
		deleteButton.className="button-secondary addimgmaps-area-rm dashicons-before dashicons-dismiss"; // WP Admin CSS class, shows it as button
		deleteButton.title="Delete area";
		deleteButton.text="Delete area";
		deleteButton.addEventListener("click", function() {
			/**
			 * Remove this clickable area & redraw (closure)
			 *
			 * @Listens	Clicks on the "Delete area" button
			 */
			metaBoxForImageSize.removeChild( newArea );
			drawImageMap( metaBoxForImageSize );
		});
		newArea.appendChild( deleteButton);
		
		switch ( shape ) {
			case "rect":
				newArea.appendChild( createCoordForRect( newArea, areaObj? areaObj.coords : null ) );
			break;
			
			case "circle":
				newArea.appendChild( createCoordForCircle( newArea, areaObj? areaObj.coords : null ) );
			break;

			// Poly also needs to add a button for extra co-ordinates.
			case "poly":
				var addCoordButton = document.createElement("a");
				addCoordButton.className="button-secondary addimgmaps-addcoord dashicons-before dashicons-plus"; 
				addCoordButton.title="+ co-ord pair";
				addCoordButton.text=" co-ord pair";
				addCoordButton.addEventListener("click", function() {
					addCoordPairForPoly( newArea );
					drawImageMap( metaBoxForImageSize );
				});
				newArea.appendChild(addCoordButton);
				if ( areaObj ) {
					appendCoordForSavedPoly( newArea, areaObj.coords );
				} else {
					appendCoordForNewPoly( newArea ) ; 
				}
			break;
			
			default:
			console.assert(false, "Unrecognised shape", shape);
		}
		
		/* Do the link field. */
		var newField = document.createElement("input");
		newField.type="url";
		newField.className="regular-text";
		newField.name= newAreaId + '-href';
		newField.maxlength=128;
		newField.size=32;
		newField.placeholder="Please enter the web link that the clickable area links to.";
		if ( areaObj ) {
			newField.value = areaObj.href;
		}
		newArea.appendChild( newField );

		newArea.appendChild( document.createElement('br'));
		
		/* Do the alt text field */
		newField = document.createElement("input");
		newField.type="text";
		newField.name= newAreaId + '-alt';
		newField.className="regular-text";
		newField.maxlength=128;
		newField.size=32;
		newField.placeholder="Please enter alternative text for people who don't see the image.";
		if ( areaObj ) {
			newField.value = areaObj.alt;
		}
		newArea.appendChild( newField );
		
		return newArea;
	}			

	/**
	 * Creates the select dropdown box to choose between the clickable area's shape
	 *
	 * @since      1.0
	 * @access     private
	 * @param      {string}   areaId  	 HTML id of the div of the clickable area
	 * @param      {string}   shape    the shape of the clickable area (default: 'rect')
	 * @returns    {object}	A DIV element containing the input forms for that clickable area
	 */	
	
	function createShapeSelect ( areaId, shapeValue ) {
//		console.log( areaId );

		var shape = document.createElement("select");
		
		var option = document.createElement("option");
		option.text="□ Rectangle";
		option.value="rect";
		option.name= areaId + "-shape";
		shape.add(option);
				
		option = document.createElement("option");
		option.text="○ Circle";
		option.value="circle";
		option.name=areaId + "-shape";
		shape.add(option);
		
		option = document.createElement("option");
		option.text="☆ Polygon";
		option.value="poly";
		option.name=areaId + "-shape";
		shape.add(option);
		
		// shape.selectedIndex = 0;
		shape.value = shapeValue;
		shape.name = areaId + '-shape';
		shape.className = pluginName + "-shape";
		
		shape.addEventListener("change", function(  ) {
				/**
				 * Recreate the clickable area when its shape is changed (closure)
				 * 
				 * @Listens The shape selector changing value.
				 */
				var newShapeValue = shape.value;

				// Our ID standard is {plugin}-{imageSize}-{areanum}
				var idBits = areaId.split("-");
								
				var parentMetaBox = $( 'fieldset#' + idBits[0] + "-" + idBits[1] ).get(0) ;
				
/* Easier to:
- retain the old areaBox, and run through lots of x.find( X ).value = y.find( Y).value
- with translating some of the co-ordinates (eg so that a polygon turns into a rectangle
					occupying roughtly the same area) being a wishlist item.
 */
				
				console.log( parentMetaBox, shape, shape.parentNode );
				var newAreaBox = createAreaBox( idBits[1], idBits[2], newShapeValue );
				var oldAreaBox = parentMetaBox.replaceChild( 
					newAreaBox,
					shape.parentNode
				);

				// The only field of type TEXT is the ALT field.
				$( newAreaBox ).children('input:text').val(
					$( oldAreaBox ).children('input:text').val()
				);

				
				// Only one with a name field sending in HREF
				$( newAreaBox ).children('[name$="href"]').val(
					$( oldAreaBox ).children('[name$="href"]').val()
				);
				
								
			}
		);	
		
		return shape;
	}
	
	/*
	 * Create a div element with input boxes for 2 pairs of co-ordinates.
	 *
	 * @param {DOMObject} areaDiv	     The Div representing the area to which the Co-ordinates are being added.
	 *	
	 * @returns {DOMObject} The div element, ready to be appended.
	 */
	
	function createCoordForRect( areaDiv, coordArray ) {
		// createNumberInput - -0-x -0-y -1-x -1-y
		var coordsDiv = document.createElement( "div" );
		coordsDiv.id = areaDiv.id + "-co";
		var span1 = document.createElement( "span" );
		span1.className='addimgmaps-coord-pair';
		
		if( ! coordArray ) {
			var randomOffset = Math.random();
			
			coordArray = [
				getAttachmentWidth() * 0.2 + 0.1*randomOffset,
				getAttachmentHeight() * 0.2 + 0.1*randomOffset,
				getAttachmentWidth() * 0.7 + 0.1*randomOffset,
				getAttachmentHeight() * 0.7 + 0.1*randomOffset,
			];
		}
		
		span1.appendChild ( 
			createNumberInput(
				areaDiv.id + "-0-x", 
				coordArray[0],
				getAttachmentWidth() - 1,
				'→'
			)
		);
		span1.appendChild ( 
			createNumberInput(
				areaDiv.id + "-0-y", 
				coordArray[1],
				getAttachmentHeight() - 1,
				'↓'
			)
		);
		
		var span2 = document.createElement( "span" );
		span2.className='addimgmaps-coord-pair';
		
		span2.appendChild ( 
			createNumberInput(
				areaDiv.id + "-1-x", 
				coordArray[2],
				getAttachmentWidth() - 1,
				'→'
			)
		);
		span2.appendChild ( 
			createNumberInput(
				areaDiv.id + "-1-y", 
				coordArray[3],
				getAttachmentHeight() - 1,
				'↓'
			)
		);
		
		coordsDiv.appendChild( span1);
		coordsDiv.appendChild( document.createTextNode(' ') );
		coordsDiv.appendChild( span2);
		return coordsDiv;
	}
	
	/*
	 * Create a div element with input boxes for the circle's position & radius.
	 *
	 * @param {DOMObject} areaDiv	DOM form element for the circle
	 *	
	 * @returns {DOMObject} The div form element, ready to be appended.
	 */
	
	function createCoordForCircle(areaDiv, coordsArray ) {	
		// create NumberInput - x, y, r
		var coordsDiv = document.createElement( "div" );
		
		if ( ! coordsArray ) {
			var randomOffset = Math.random();
			coordsArray = [
				getAttachmentWidth() * 0.3 + 0.4*randomOffset,
				getAttachmentHeight() * 0.3 - 0.4*randomOffset,			
				(randomOffset+0.2)*(getAttachmentHeight()+getAttachmentWidth())/4
			];
		}
		coordsDiv.id = areaDiv.id + "-co";
		coordsDiv.appendChild ( 
			createNumberInput(
				areaDiv.id + "-x", 
				coordsArray[0],
				getAttachmentWidth() - 1,
				'→'
			)
		);
		coordsDiv.appendChild ( 
			createNumberInput(
				areaDiv.id + "-y", 
				coordsArray[1],
				getAttachmentHeight() -1,
				'↓'
			)
		);
		coordsDiv.appendChild ( 
			createNumberInput(
				areaDiv.id + "-r", 
				coordsArray[2],
				/* At this maximum, the circle could eclipse the whole area */
				(getAttachmentHeight()+getAttachmentWidth())/2,
				'𝑟'
			)
		);
		return coordsDiv;		
	}

	/*
	 * Append 3 div element with input boxes for a co-ordinate pair each.
	 *
	 * @param {DOMObject} areaDiv	DOM form element for the polygon
	 *
	 * @see createCoordPairForPoly
	 * 
	 * Polygons have an arbitrary number of co-ordinates, and hence more requirements.
	 * Thus these are created with a 'delete' button. But because a polygon needs at least
	 * 3 co-ordinates, the delete button is initially hidden.
	 *
	 * @returns {boolean} True (because each co-ord pair is its own div, they must be appended in-function)
	 */
	
	function appendCoordForNewPoly( areaDiv ) {
		// The polygons have multiple co-ordinate divisions
		var randomOffset = Math.random();
		
		areaDiv.appendChild( 
			createCoordPairForPoly( 
				areaDiv.id + "-0", 
				getAttachmentWidth() * 0.2 + 0.1*randomOffset,
				getAttachmentHeight() * 0.3 + 0.1*randomOffset
			)
		);

		areaDiv.appendChild( 
			createCoordPairForPoly( 
				areaDiv.id + "-1", 
				getAttachmentWidth() * 0.4 + 0.2*randomOffset,
				getAttachmentHeight() * 0.75
			)
		);

		areaDiv.appendChild( 
			createCoordPairForPoly( 
				areaDiv.id + "-2", 
				getAttachmentWidth() * 0.75,
				getAttachmentHeight() * 0.3 - 0.1*randomOffset
			)
		);
		
		// Make sure the delete buttons start off hidden
		$(areaDiv).find(".addimgmaps-delete-coords").hide();
		
		return true;
	
			// Otherwise create 2 co-ords
	}

	/*
	 * Append div elements with input boxes for a co-ordinate for all saved points.
	 *
	 * @param {DOMObject} areaDiv		DOM form element for the polygon
	 * @param {array}	  coordsArray	Array of the co-ordinates
	 *
	 * @see createCoordPairForPoly
	 * 
	 * Polygons have an arbitrary number of co-ordinates, and hence more requirements.
	 * And the delete button needs to be shown or hidden depending on the number of
	 * co-ordinate paris.
	 *
	 * @returns {boolean} True (because each co-ord pair is its own div, they must be appended in-function)
	 */

	 function appendCoordForSavedPoly( areaDiv, coordsArray ) {
		// The polygons have multiple co-ordinate divisions
		for (var i = 0; i*2 < coordsArray.length ; i++ ) {
		
			areaDiv.appendChild( 
				createCoordPairForPoly( 
					areaDiv.id + "-" + i, 
					coordsArray[2*i],
					coordsArray[2*i+1]
				)
			);

		}
		
		// Make sure the delete buttons starts off hidden for triangles
		if ( coordsArray.length == 6 ) {
			$(areaDiv).find(".addimgmaps-delete-coords").hide();
		}
		
		return true;
	
	}
	
	
	
	/*
	 * Create a pair of polygon co-ordinates starting at the given dimensions.
	 *
	 * @param	{string}	idStem		The area div id, plus an index for the co-ordinate pair
	 * @param 	{int}   	x	        x co-ordinate.
	 * @param 	{int}   	y	        y co-ordinate.
	 * 
	 * @returns {object} 	DOM object for co-ordinate pair input elements.
	 */
	function createCoordPairForPoly( idStem, x, y ) {
		var coordsDiv = document.createElement( "div" );
		coordsDiv.id = idStem;
		coordsDiv.appendChild ( 
			createNumberInput( idStem + "-x", x, getAttachmentWidth(), '→' )
		);
		coordsDiv.appendChild ( 
			createNumberInput( idStem + "-y", y, getAttachmentHeight(), '↓' )
		);
		coordsDiv.className="poly-coords";
		
		var deleteCoords = document.createElement( "a" );
		deleteCoords.className="button-secondary addimgmaps-delete-coords dashicons-before dashicons-no-alt"; 
		deleteCoords.title="Delete co-ordinates";
		deleteCoords.text=" "; /* The dashicon does enough. */
		deleteCoords.addEventListener("click", function() {
		/*
		 * Deletes the co-ordinate pair & makes follow-on changes (closure).
		 *
		 * Delete co-ordinate pair, redraw the image, and hide the buttons if
		 * the polygon has now become a triangle.
		 *
		 * @Listens for clicks on the "delete" button by a polygon co-ord pair
		 */
			var jQ_areaDiv = $(coordsDiv).closest("div." + pluginName + "-area");
			var jQ_numCoords = jQ_areaDiv.find(".poly-coords").length;
			if (jQ_numCoords <= 4) { // If we are about to hit the minimum co-ord pairs
				jQ_areaDiv.find(".addimgmaps-delete-coords").hide();
			}
			var areaDiv = jQ_areaDiv.get(0);
			areaDiv.removeChild( coordsDiv );
			// Pass drawImageMap the event, allowing it to track down the calling element that has the data
			drawImageMap( areaDiv );
		});
		coordsDiv.appendChild( deleteCoords );
		
		// NB: this doesn't try to count the number of coords; callers must do that
		return coordsDiv;
	}

	/** 
	 * Add a polygon co-ordinate pair (or rather their input elements) 
     *
	 * Becase the polygon now has vertices to lose, this makes the 'delete' 
	 * button visible.
	 
	 * @Listens to the "add" button on polygon area.
	 *
	 *
	 * @see createCoordPairForPoly
	 *
	 * @param	{DOMObject}	areaDiv		DOM form element for the polygon
	 * @returns {DomObject}	areaDiv		DOM form element with added co-ord pair 
	 */ 
	function addCoordPairForPoly ( areaDiv ) {
		var whichIdNum = nextChildIdNum( areaDiv ), 
			jQ_coords = $( areaDiv).find(".poly-coords");
		// A DEBUG sanity check
		console.assert( whichIdNum > 2, 
			"Called addCoordPairForPoly with ", areaDiv, "NextChildIdNum returned ", whichIdNum );
			
		jQ_coords.last().after(
			createCoordPairForPoly( 
				areaDiv.id + "-" + whichIdNum,
				getAttachmentWidth()*2/whichIdNum, //Will slowly track to the left, starting at 66%
				getAttachmentHeight()*( 0.1 + 0.2 * (whichIdNum % 2)) // Defaults to an up-down zig-zag
			)
		);
		
		// Make sure all the delete buttons are visible
		// (In theory, I could set this to only happen if jQ_coords.lenght==3, because that's
		//  the only time it should be needed, but a little robustness won't hurt.)
		$(areaDiv).find(".addimgmaps-delete-coords").show();
		
		return areaDiv;
	}

	/**
	 * Finds the next child index number for an HTML element with countable sub-elements
	 *
	 * This is used both when adding a new area to an imageMap, or a new vertex to a
	 * polygon. It relies on a consistent HTML id convention: a list of categories,
	 * subcategories, and index numbers, connected by hyphens:
	 * 		addImgMaps-full-0-3
	 *
	 * Note that the "next index" isn't the same as the number of relevant children, because
	 * some elements could have been deleted from the middle.
	 *
	 * @param 	{DOMObject} 	htmlElement   The element to search.
	 * @returns {int}			index to give to the *next* sub-element
	 */
	function nextChildIdNum( htmlElement ) {
		var lastAreaDiv= $(htmlElement).children("div").get(-1);
		if ( lastAreaDiv === undefined || lastAreaDiv.tagName.toUpperCase() != "DIV" ) {
//			console.log ("Looking for lastAreaDiv of ", htmlElement, "Found only ", lastAreaDiv);
//			console.trace;
			return 0;
		} else {
			var lastId = lastAreaDiv.id;
			console.log(lastId);
		// Find the bit after the last "-" and turn it into a number.
			var suffix = lastId.substr( lastId.lastIndexOf("-")+1);
			return parseInt( suffix) + 1;			
		}
	}

/**
 * Create an Input element for a number.
 * 
 * Used to set up all co-ordinates.
 *
 * @param 	{string} 	id		HTML id to give the new number input box
 * @param 	{int}		value	Numerical value to give the input box
 * @param 	{int}		max		Max numerical value
 *
 * @returns {DOMObject} DOM element of the new numerical input box
 */ 
	function createNumberInput( numberId, defaultValue, max, labelText ) {
		var label = document.createElement('label');
		label.textContent = labelText;
		var numberInput = document.createElement("input");
		numberInput.type="number";
		numberInput.name=numberId;
		numberInput.id=numberId;
		numberInput.className="regular-text";
		numberInput.min=0;
		if ( max ) {
			numberInput.max=max;
		}
		numberInput.value = Math.round( defaultValue );
//		return numberInput;
		label.appendChild(numberInput);
		return label;
	}	
 
 
/**
 * Redraws the clickable areas on the canvas.
 *
 * @param {object}   [e]		The event that triggered the redraw, OR
 *								The DOM Object that was clicked to trigger the event OR
								The DOM Object on which the event handler sat
 *
 * @returns			null
 */	
	
	function drawImageMap( e ) {

		// For some reason, I can't trust 'this' being a form entry field; it might be a div.
		// And I certainly can't trust "targetElement" either.
		var jQ_metaBoxForImageSize, canvas, context, scale;
		
		/* If this was triggered by a deletion, then "e.target" (or e) could be a DOMObject 
		 * that has already been removed. So we look at e.currentTarget
		 */
		if (e.currentTarget) {
			jQ_metaBoxForImageSize = $(e.currentTarget);			
		} else if (e.hasChildNodes) {
			jQ_metaBoxForImageSize = $(e);
		} else {
			// Else throw fatal error, as this should not happen.
			throw "drawImageMap called with " + e + " neither event nor DOM ancestor.";
		}

		// Look up the treat so that we've found the form element.
		// TODO - this will not work, as the per-size node won't be a form.
		if ( ! jQ_metaBoxForImageSize.is("fieldset") ) {
			jQ_metaBoxForImageSize = jQ_metaBoxForImageSize.closest("fieldset");
			console.assert( jQ_metaBoxForImageSize.length == 1, jQ_metaBoxForImageSize );
		}
		
		// There's only going to be one canvas
		canvas = $('#' + pluginName +"-canvas")[0];
		console.assert ( canvas );
		context = canvas.getContext("2d");
		context.globalCompositeOperation="xor";
		
				
		// Get Area Divs - jQuery for div elements that are a direct child of the element matching this id.

		// About to start drawing, so choose this moment to clear the canvas.
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.strokeStyle = "black";
		context.linewidth = "2em";
		context.shadowBlur = "10";
		context.shadowColor = "#ff8";
		
		/*
		 * {scale} is canvas/attachment
		 */
		scale = Math.min( 
			( canvas.width / getAttachmentWidth() ), 
			( canvas.height / getAttachmentHeight() )
		);
		
		
		jQ_metaBoxForImageSize.children("div").each( function(index,element) {
			// What shape is this?
			var shapeChooser = $( element ).children("select." + pluginName + "-shape");
			if ( ! shapeChooser.length ) {
				// Then this isn't an area div; it's something else.
				// console.log("Skipping div. Index & element are:", index, element);
				return null;
			}
			console.assert ( shapeChooser.length == 1 , shapeChooser );
// TODO Scale down x & y where needed

			// NB: this ignores the id & relies entirely on the input order
			var x, y, r, coords;

			// All 3 start with x & y co-ords & a new path.
			coords = $( element ).find(":input[type=number]");
			console.assert ( coords.length > 2, coords );
			
			x = coords[0].value;
			y = coords[1].value;

			context.beginPath();
			
			switch( shapeChooser.val() ) {

			// Both of these involve getting a list of x/y pairs and drawing line between them
				case "rect":
					var x2 = coords[2].value;
					var y2 = coords[3].value;
					// strokeRect takes width & height, not co-ords
					context.strokeRect(scale*x, scale*y, scale*(x2-x), scale*(y2-y));
					// Doesn't actually need the begin / end / stroke sequence, but can't hurt.
				break;
				
				case "poly":
					context.moveTo(scale*x,scale*y);
					coords.splice(0,2); // remove the first pair of co-ords
					while ( coords.length ) {
						x = coords[0].value;
						y = coords[1].value;
						coords.splice(0,2); // and then remove that pair
						context.lineTo(scale*x,scale*y);
					}
				break;

				// Circles involve fetching x, y, and r
				case "circle":
					r = coords[2].value;
					context.arc( scale*x, scale*y, scale*r, 0, Math.PI * 2, false);
				break;
				
				default:
				console.assert ( false, "Unrecognised shape", shapeChooser );
				
			} // End switch

			context.closePath();
				
			// Still need to fill it in

			context.stroke();


			
		} // end of Each closer
		); // end of fxn

	} // end function drawImageMap

	return {
		init: init
	};

}( jQuery ); // closureDefined

// wait till all loaded & call the init method within the closure
jQuery(document).ready( function() {
	addImgMapsClosure.init(); // now handled by button
} );

/**
 * Extant issues:
 * 
 * When testing in Chrome, I expect the browser to honour the 'min' and 'max' values set on input:number fields.
 * It doesn't.
 *
 */