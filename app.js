document.addEventListener('DOMContentLoaded', () => {
    const contactList = document.getElementById('contact-list');
    const template = document.getElementById('contact-point-template');
    const initialMessageTemplate = document.getElementById('initial-message-template');
    const sachsenMapObject = document.getElementById('sachsen-map');
    const filterBar = document.getElementById('filter-bar');

    let allData = {};
    let activeCountyPath = null;
    let loadMoreButton = null;

    const itemsPerLoad = 5;

    /**
     * NEU: Prüft alle Landkreise im SVG und graut die aus, die keine Daten haben.
     */
    const updateCountyAvailability = () => {
        const svgDoc = sachsenMapObject.contentDocument;
        if (!svgDoc || !allData) return;

        const counties = svgDoc.querySelectorAll('#counties path');
        counties.forEach(path => {
            const countyId = path.id;
            // Prüfen, ob der Landkreis in den Daten existiert und Einträge hat
            const hasData = allData[countyId] && 
                            allData[countyId].contactPoints && 
                            allData[countyId].contactPoints.length > 0;

            if (!hasData) {
                path.classList.add('empty'); // CSS sorgt für Grau und Klick-Sperre
            } else {
                path.classList.remove('empty');
            }
        });
    };

    const updateActiveMapCounty = (countyId) => {
        const svgDoc = sachsenMapObject.contentDocument;
        if (!svgDoc) return;

        if (activeCountyPath) {
            activeCountyPath.classList.remove('active');
            activeCountyPath = null;
        }

        if (countyId !== 'all') {
            const countyPath = svgDoc.getElementById(countyId);
            if (countyPath) {
                countyPath.classList.add('active');
                activeCountyPath = countyPath;
            }
        }
    };

    const updateActiveFilterButton = (countyId) => {
        const buttons = filterBar.querySelectorAll('button');
        buttons.forEach(button => {
            button.classList.toggle('active', button.dataset.county === countyId);
        });
    };

    const updateHeadlineVisibility = () => {
        const allCountyHeadlines = document.querySelectorAll('#contact-points h3');
        allCountyHeadlines.forEach(headline => {
            const county = headline.dataset.county;
            const pointsForCounty = document.querySelectorAll(`.contact-point[data-county="${county}"]`);
            const isAnyPointVisible = Array.from(pointsForCounty).some(point => !point.classList.contains('hidden'));

            headline.classList.toggle('hidden', !isAnyPointVisible);
        });
    };

    const handleLoadMore = () => {
        const activeButton = filterBar.querySelector('button.active');
        if (!activeButton) return;
        const activeCountyId = activeButton.dataset.county;
        const hiddenPoints = document.querySelectorAll(`.contact-point.hidden[data-county="${activeCountyId}"]`);

        for (let i = 0; i < itemsPerLoad && i < hiddenPoints.length; i++) {
            hiddenPoints[i].classList.remove('hidden');
        }

        updateHeadlineVisibility();

        if (hiddenPoints.length <= itemsPerLoad) {
            loadMoreButton.style.display = 'none';
        }
    };

    const filterContactPoints = (countyId) => {
        const allCountyHeadlines = document.querySelectorAll('#contact-points h3');
        const allContactPoints = document.querySelectorAll('.contact-point');
        const initialMessage = document.querySelector('.initial-message');

        if (!loadMoreButton) {
            loadMoreButton = document.createElement('button');
            loadMoreButton.textContent = 'Mehr laden';
            loadMoreButton.id = 'load-more';
            loadMoreButton.addEventListener('click', handleLoadMore);
            contactList.appendChild(loadMoreButton);
        }
        loadMoreButton.style.display = 'none';
        if (initialMessage) initialMessage.style.display = 'none';

        if (countyId === 'all') {
            if (initialMessage) initialMessage.style.display = 'block';
            allCountyHeadlines.forEach(headline => headline.classList.add('hidden'));
            allContactPoints.forEach(point => point.classList.add('hidden'));
        } else {
            allCountyHeadlines.forEach(headline => {
                headline.classList.toggle('hidden', headline.dataset.county !== countyId);
            });

            const countyPoints = Array.from(allContactPoints).filter(p => p.dataset.county === countyId);
            allContactPoints.forEach(point => point.classList.add('hidden'));

            countyPoints.forEach((point, index) => {
                if (index < itemsPerLoad) {
                    point.classList.remove('hidden');
                }
            });

            if (countyPoints.length > itemsPerLoad) {
                loadMoreButton.style.display = 'block';
            }
        }

        updateHeadlineVisibility();
        updateActiveFilterButton(countyId);
        updateActiveMapCounty(countyId);
    };

    /**
     * GEÄNDERT: Erstellt Filter-Buttons NUR für Landkreise mit Daten.
     */
    const createFilterBar = () => {
        filterBar.innerHTML = ''; 
        for (const countyKey in allData) {
            const county = allData[countyKey];
            
            // NUR Button erstellen, wenn Daten vorhanden sind:
            if (county.contactPoints && county.contactPoints.length > 0) {
                const button = document.createElement('button');
                button.textContent = county.fullName;
                button.dataset.county = countyKey;
                button.addEventListener('click', () => filterContactPoints(countyKey));
                filterBar.appendChild(button);
            }
        }
    };

    // ... (Die Hilfsfunktionen wie fallbackCopyTextToClipboard, getOpeningStatus etc. bleiben hier unverändert)

    /**
     * Renders the entire list of contact points from the fetched data.
     */
    const renderContactPoints = () => {
        contactList.innerHTML = '';
        if (initialMessageTemplate) {
            const initialMessageClone = initialMessageTemplate.content.cloneNode(true);
            contactList.appendChild(initialMessageClone);
        }

        for (const countyKey in allData) {
            const county = allData[countyKey];
            if (county.contactPoints && county.contactPoints.length > 0) {
                const countyName = document.createElement('h3');
                countyName.textContent = county.fullName;
                countyName.dataset.county = countyKey;
                contactList.appendChild(countyName);

                county.contactPoints.forEach(point => {
                    const clone = template.content.cloneNode(true);
                    const pointDiv = clone.querySelector('.contact-point');
                    pointDiv.dataset.county = countyKey;
                    
                    // (Hier folgt dein Logik-Code zum Befüllen der Templates - Name, Adresse, etc.)
                    // ... (Code aus deinem Original einfügen)
                    
                    contactList.appendChild(clone);
                });
            }
        }
    };

    const autoSelectCountyOnMobile = () => {
        const mapContainer = document.getElementById('map-container');
        const isMobileView = window.getComputedStyle(mapContainer).display === 'none';
        const activeButton = filterBar.querySelector('button.active');
        const noCountySelected = !activeButton || activeButton.dataset.county === 'all';

        if (isMobileView && noCountySelected) {
            const firstCountyKey = Object.keys(allData).find(key => allData[key].contactPoints?.length > 0);
            if (firstCountyKey) {
                filterContactPoints(firstCountyKey);
            }
        }
    };

    /**
     * Daten laden
     */
    fetch('contact-points.json')
        .then(response => response.json())
        .then(data => {
            allData = data;
            renderContactPoints();
            createFilterBar();
            filterContactPoints('all');
            autoSelectCountyOnMobile();
            
            // NEU: Sofort prüfen, welche Landkreise Daten haben
            updateCountyAvailability();
        })
        .catch(error => console.error('Error fetching contact points:', error));

    window.addEventListener('resize', autoSelectCountyOnMobile);
    sachsenMapObject.addEventListener('dragstart', (e) => e.preventDefault());

    /**
     * SVG Map laden
     */
    sachsenMapObject.addEventListener('load', () => {
        const svgDoc = sachsenMapObject.contentDocument;
        if (!svgDoc) return;

        svgDoc.addEventListener('mousedown', (e) => e.preventDefault());
        svgDoc.addEventListener('dragstart', (e) => e.preventDefault());

        // NEU: Beim Laden des SVGs Farben aktualisieren
        updateCountyAvailability();

        const counties = svgDoc.querySelectorAll('#counties path');
        counties.forEach(county => {
            county.addEventListener('click', (event) => {
                const countyId = event.currentTarget.id;
                
                // Falls der Landkreis die Klasse 'empty' hat, ignorieren wir den Klick
                // (Obwohl CSS pointer-events: none das meist schon regelt)
                if (event.currentTarget.classList.contains('empty')) return;

                if (activeCountyPath && activeCountyPath.id === countyId) {
                    filterContactPoints('all');
                } else {
                    filterContactPoints(countyId);
                }
            });
        });

        const mapBackground = svgDoc.getElementById('map');
        if (mapBackground) {
            mapBackground.addEventListener('click', (event) => {
                if (event.target.id === 'map') {
                    filterContactPoints('all');
                }
            });
        }
    });
});
