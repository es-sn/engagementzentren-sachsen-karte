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
     * Prüft, ob ein Landkreis echte Daten hat (mindestens ein Eintrag mit Name).
     */
    const hasCountyRealData = (countyKey) => {
        const county = allData[countyKey];
        if (!county || !county.contactPoints) return false;
        return county.contactPoints.some(p => p.name && p.name.trim() !== "");
    };

    /**
     * Graut Landkreise ohne echte Daten im SVG aus.
     */
    const updateCountyAvailability = () => {
        const svgDoc = sachsenMapObject.contentDocument;
        if (!svgDoc || !allData) return;

        const counties = svgDoc.querySelectorAll('#counties path');
        counties.forEach(path => {
            if (hasCountyRealData(path.id)) {
                path.classList.remove('empty');
            } else {
                path.classList.add('empty');
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
        if (initialMessage) initialMessage.style.display = 'block';

        if (countyId === 'all') {
            allCountyHeadlines.forEach(headline => headline.classList.add('hidden'));
            allContactPoints.forEach(point => point.classList.add('hidden'));
        } else {
            if (initialMessage) initialMessage.style.display = 'none';
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

    /**
     * Erstellt Filter-Buttons nur für Landkreise mit echten Inhalten.
     */
    const createFilterBar = () => {
        filterBar.innerHTML = ''; 
        for (const countyKey in allData) {
            if (hasCountyRealData(countyKey)) {
                const button = document.createElement('button');
                button.textContent = allData[countyKey].fullName;
                button.dataset.county = countyKey;
                button.addEventListener('click', () => filterContactPoints(countyKey));
                filterBar.appendChild(button);
            }
        }
    };

    // Hilfsfunktionen für das Rendering
    const getOpeningStatus = (structuredHours) => {
        if (!structuredHours) return {status: 'unknown'};
        const now = new Date();
        const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const today = days[now.getDay()];
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const todaysHours = structuredHours[today] || [];
        for (const entry of todaysHours) {
            if (entry === 'appointment') return {status: 'appointment'};
            const match = entry.match(/(\d{2}):(\d{2})–(\d{2}):(\d{2})/);
            if (match) {
                const start = parseInt(match[1]) * 60 + parseInt(match[2]);
                const end = parseInt(match[3]) * 60 + parseInt(match[4]);
                if (currentTime >= start && currentTime < end) {
                    return {status: 'open', closesAt: `${match[3]}:${match[4]}`};
                }
            }
        }
        return {status: 'closed'};
    };

    const renderContactPoints = () => {
        contactList.innerHTML = '';
        if (initialMessageTemplate) contactList.appendChild(initialMessageTemplate.content.cloneNode(true));

        for (const countyKey in allData) {
            const county = allData[countyKey];
            if (!hasCountyRealData(countyKey)) continue;

            const countyHeadline = document.createElement('h3');
            countyHeadline.textContent = county.fullName;
            countyHeadline.dataset.county = countyKey;
            contactList.appendChild(countyHeadline);

            county.contactPoints.forEach(point => {
                if (!point.name || point.name.trim() === "") return;

                const clone = template.content.cloneNode(true);
                const pointDiv = clone.querySelector('.contact-point');
                pointDiv.dataset.county = countyKey;

                // Name & Träger
                clone.querySelector('.name').textContent = point.name;
                const carrierEl = clone.querySelector('.carrier');
                if (point.carrier) carrierEl.textContent = point.carrier; else carrierEl.style.display = 'none';

                // Helper: Felder ein/ausblenden
                const toggleWrapper = (wrapperSelector, value, text) => {
                    const wrapper = clone.querySelector(wrapperSelector);
                    if (value && String(value).trim() !== "") {
                        if (text) wrapper.querySelector('span, a').textContent = text;
                        wrapper.style.display = 'flex';
                    } else {
                        wrapper.style.display = 'none';
                    }
                };

                // Adresse
                const addr = point.address;
                const addrText = (addr && addr.street) ? `${addr.street}, ${addr.postalCode} ${addr.city}` : "";
                toggleWrapper('.address-wrapper', addrText, addrText);

                // Telefon (Array oder String)
                const phone = Array.isArray(point.contact?.phone) ? point.contact.phone[0] : point.contact?.phone;
                toggleWrapper('.phone-wrapper', phone, phone);

                // E-Mail
                const emailA = clone.querySelector('.email');
                if (point.contact?.email) {
                    emailA.href = `mailto:${point.contact.email}`;
                    emailA.textContent = point.contact.email;
                } else {
                    clone.querySelector('.email-wrapper').style.display = 'none';
                }

                // Website
                const webA = clone.querySelector('.website');
                const webUrl = point.contact?.web || point.contact?.website;
                if (webUrl) {
                    webA.href = webUrl.startsWith('http') ? webUrl : `https://${webUrl}`;
                    webA.textContent = "Website besuchen";
                } else {
                    clone.querySelector('.website-wrapper').style.display = 'none';
                }

                // Social Media
                const wireSocial = (selector, url) => {
                    const el = clone.querySelector(selector);
                    if (url && url.trim() !== "") el.href = url; else el.style.display = 'none';
                };
                wireSocial('.instagram-wrapper', point.social?.instagram);
                wireSocial('.facebook-wrapper', point.social?.facebook);
                wireSocial('.linkedin-wrapper', point.social?.linkedin);

                // Download
                const dl = point.download;
                const dlWrapper = clone.querySelector('.download-wrapper');
                if (dl && dl.url) {
                    const dlA = dlWrapper.querySelector('.download');
                    dlA.href = dl.url;
                    dlA.textContent = dl.text || "Download";
                } else {
                    dlWrapper.style.display = 'none';
                }

                contactList.appendChild(clone);
            });
        }
    };

    // Daten laden & Start
    fetch('contact-points.json')
        .then(res => res.json())
        .then(data => {
            allData = data;
            renderContactPoints();
            createFilterBar();
            filterContactPoints('all');
            updateCountyAvailability();
        })
        .catch(err => console.error("Fehler beim Laden der Daten:", err));

    sachsenMapObject.addEventListener('load', () => {
        updateCountyAvailability();
        const svgDoc = sachsenMapObject.contentDocument;
        if (!svgDoc) return;
        
        svgDoc.querySelectorAll('#counties path').forEach(path => {
            path.addEventListener('click', (e) => {
                if (path.classList.contains('empty')) return;
                const id = e.currentTarget.id;
                filterContactPoints(activeCountyPath?.id === id ? 'all' : id);
            });
        });
    });
});
