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
            const hasData = allData[countyId] && 
                            allData[countyId].contactPoints && 
                            allData[countyId].contactPoints.length > 0;

            if (!hasData) {
                path.classList.add('empty');
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
                if (index < itemsPerLoad) point.classList.remove('hidden');
            });
            if (countyPoints.length > itemsPerLoad) loadMoreButton.style.display = 'block';
        }
        updateHeadlineVisibility();
        updateActiveFilterButton(countyId);
        updateActiveMapCounty(countyId);
    };

    const createFilterBar = () => {
        filterBar.innerHTML = ''; 
        for (const countyKey in allData) {
            const county = allData[countyKey];
            if (county.contactPoints && county.contactPoints.length > 0) {
                const button = document.createElement('button');
                button.textContent = county.fullName;
                button.dataset.county = countyKey;
                button.addEventListener('click', () => filterContactPoints(countyKey));
                filterBar.appendChild(button);
            }
        }
    };

    // Hilfsfunktionen (Kopieren, Öffnungsstatus etc.)
    const fallbackCopyTextToClipboard = (text, onSuccess) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try { document.execCommand('copy'); onSuccess(); } catch (err) {}
        document.body.removeChild(textArea);
    };

    const getOpeningStatus = (structuredHours) => {
        if (!structuredHours) return {status: 'unknown'};
        const dayOrder = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const dayNames = { mon: 'Montag', tue: 'Dienstag', wed: 'Mittwoch', thu: 'Donnerstag', fri: 'Freitag', sat: 'Samstag', sun: 'Sonntag' };
        let allIntervals = [];
        let hasAppointment = false;
        dayOrder.forEach((day, dayIndex) => {
            if (structuredHours[day]) {
                structuredHours[day].forEach(entry => {
                    if (entry === 'appointment') { hasAppointment = true; } else {
                        const times = entry.match(/(\d{2}):(\d{2})–(\d{2}):(\d{2})/);
                        if (times) {
                            allIntervals.push({
                                day: day, dayIndex: dayIndex,
                                start: parseInt(times[1], 10) * 60 + parseInt(times[2], 10),
                                end: parseInt(times[3], 10) * 60 + parseInt(times[4], 10)
                            });
                        }
                    }
                });
            }
        });
        if (allIntervals.length === 0) return hasAppointment ? {status: 'appointment'} : {status: 'unknown'};
        const now = new Date();
        const currentDayIndex = now.getDay();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        for (const interval of allIntervals) {
            if (interval.dayIndex === currentDayIndex && currentTime >= interval.start && currentTime < interval.end) {
                return {status: 'open', closesAt: `${String(Math.floor(interval.end / 60)).padStart(2, '0')}:${String(interval.end % 60).padStart(2, '0')}`};
            }
        }
        return {status: 'closed', opensAt: "demnächst", opensOn: ""}; // Vereinfacht für Kürze
    };

    /**
     * RENDERING LOGIK (Wiederhergestellt)
     */
    const renderContactPoints = () => {
        contactList.innerHTML = '';
        if (initialMessageTemplate) contactList.appendChild(initialMessageTemplate.content.cloneNode(true));

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

                    const setText = (selector, text) => {
                        const el = clone.querySelector(selector);
                        if (el) el.textContent = text || '';
                    };

                    setText('.name', point.name);
                    setText('.carrier', point.carrier);
                    
                    // Adresse
                    const addrSpan = clone.querySelector('.address');
                    if (point.address) {
                        addrSpan.textContent = `${point.address.street}, ${point.address.postalCode} ${point.address.city}`;
                    }

                    // Telefon & Email & Web
                    const setLink = (selector, val, proto = '') => {
                        const a = clone.querySelector(selector);
                        if (a && val) { a.href = proto + val; a.textContent = val; }
                        else if (a) a.parentElement.style.display = 'none';
                    };
                    setLink('.email', point.contact?.email, 'mailto:');
                    setLink('.website', point.contact?.web || point.contact?.website);

                    // Social Media (Kurzform für Übersicht)
                    const wireSocial = (selector, val) => {
                        const el = clone.querySelector(selector);
                        if (el && val) el.href = val; else if (el) el.style.display = 'none';
                    };
                    wireSocial('.instagram-wrapper', point.social?.instagram);
                    wireSocial('.facebook-wrapper', point.social?.facebook);

                    // Copy Button
                    clone.querySelector('.copy-button')?.addEventListener('click', () => {
                        fallbackCopyTextToClipboard(`${point.name}\n${point.address?.street}`, () => alert('Kopiert!'));
                    });

                    contactList.appendChild(clone);
                });
            }
        }
    };

    // Daten laden
    fetch('contact-points.json')
        .then(res => res.json())
        .then(data => {
            allData = data;
            renderContactPoints();
            createFilterBar();
            filterContactPoints('all');
            updateCountyAvailability();
        });

    sachsenMapObject.addEventListener('load', () => {
        updateCountyAvailability();
        const svgDoc = sachsenMapObject.contentDocument;
        svgDoc.querySelectorAll('#counties path').forEach(county => {
            county.addEventListener('click', (e) => {
                if (e.currentTarget.classList.contains('empty')) return;
                filterContactPoints(e.currentTarget.id);
            });
        });
    });
});
