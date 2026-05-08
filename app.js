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

    const hasCountyRealData = (countyKey) => {
        const county = allData[countyKey];
        if (!county || !county.contactPoints) return false;
        return county.contactPoints.some(p => p.name && p.name.trim() !== "");
    };

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

    const filterContactPoints = (countyId) => {
        const allCountyHeadlines = document.querySelectorAll('#contact-points h3');
        const allContactPoints = document.querySelectorAll('.contact-point');
        const initialMessage = document.querySelector('.initial-message');

        if (!loadMoreButton) {
            loadMoreButton = document.createElement('button');
            loadMoreButton.textContent = 'Mehr laden';
            loadMoreButton.id = 'load-more';
            loadMoreButton.addEventListener('click', () => {
                const activeButton = filterBar.querySelector('button.active');
                if (!activeButton) return;
                const activeId = activeButton.dataset.county;
                const hidden = document.querySelectorAll(`.contact-point.hidden[data-county="${activeId}"]`);
                for (let i = 0; i < itemsPerLoad && i < hidden.length; i++) {
                    hidden[i].classList.remove('hidden');
                }
                if (hidden.length <= itemsPerLoad) loadMoreButton.style.display = 'none';
            });
            contactList.appendChild(loadMoreButton);
        }
        
        loadMoreButton.style.display = 'none';
        if (initialMessage) initialMessage.style.display = (countyId === 'all') ? 'block' : 'none';

        allCountyHeadlines.forEach(h => h.classList.add('hidden'));
        allContactPoints.forEach(p => p.classList.add('hidden'));

        if (countyId !== 'all') {
            const headline = document.querySelector(`#contact-points h3[data-county="${countyId}"]`);
            if (headline) headline.classList.remove('hidden');

            const countyPoints = Array.from(allContactPoints).filter(p => p.dataset.county === countyId);
            countyPoints.forEach((p, i) => { if (i < itemsPerLoad) p.classList.remove('hidden'); });
            if (countyPoints.length > itemsPerLoad) loadMoreButton.style.display = 'block';
        }

        updateActiveFilterButton(countyId);
        updateActiveMapCounty(countyId);
    };

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

    const renderContactPoints = () => {
        contactList.innerHTML = '';
        if (initialMessageTemplate) contactList.appendChild(initialMessageTemplate.content.cloneNode(true));

        for (const countyKey in allData) {
            const county = allData[countyKey];
            if (!hasCountyRealData(countyKey)) continue;

            const countyHeadline = document.createElement('h3');
            countyHeadline.textContent = county.fullName;
            countyHeadline.dataset.county = countyKey;
            countyHeadline.classList.add('hidden');
            contactList.appendChild(countyHeadline);

            county.contactPoints.forEach(point => {
                if (!point.name || point.name.trim() === "") return;

                const clone = template.content.cloneNode(true);
                const pointDiv = clone.querySelector('.contact-point');
                pointDiv.dataset.county = countyKey;
                pointDiv.classList.add('hidden');

                // Name & Träger
                clone.querySelector('.name').textContent = point.name;
                const carrierEl = clone.querySelector('.carrier');
                if (point.carrier) carrierEl.textContent = point.carrier; else carrierEl.style.display = 'none';

                // Helper für normale Textfelder
                const fillText = (selector, wrapperSelector, value) => {
                    const wrapper = clone.querySelector(wrapperSelector);
                    const el = clone.querySelector(selector);
                    if (value && String(value).trim() !== "") {
                        el.textContent = value;
                        wrapper.style.display = 'flex';
                    } else {
                        wrapper.style.display = 'none';
                    }
                };

                // Adresse & Telefon
                fillText('.address', '.address-wrapper', (point.address?.street) ? `${point.address.street}, ${point.address.postalCode} ${point.address.city}` : "");
                const phoneVal = Array.isArray(point.contact?.phone) ? point.contact.phone.filter(n => n !== "").join(', ') : point.contact?.phone;
                fillText('.phone-numbers', '.phone-wrapper', phoneVal);

                // Links (Email & Website)
                const fillLink = (wrapperSelector, anchorSelector, value, isEmail = false) => {
                    const wrapper = clone.querySelector(wrapperSelector);
                    const a = clone.querySelector(anchorSelector);
                    if (wrapper && a && value && value.trim() !== "") {
                        a.href = isEmail ? `mailto:${value}` : (value.startsWith('http') ? value : `https://${value}`);
                        a.textContent = isEmail ? value : "Website besuchen";
                        wrapper.style.display = 'flex';
                    } else if (wrapper) {
                        wrapper.style.display = 'none';
                    }
                };

                fillLink('.email-wrapper', '.email', point.contact?.email, true);
                fillLink('.website-wrapper', '.website', point.contact?.web || point.contact?.website);

                // SOCIAL MEDIA (Korrektur: sucht <a> im Wrapper und setzt Text)
                const fillSocial = (wrapperSelector, url, label) => {
                    const wrapper = clone.querySelector(wrapperSelector);
                    if (!wrapper) return;
                    const a = wrapper.querySelector('a');
                    if (a && url && url.trim() !== "") {
                        a.href = url.startsWith('http') ? url : `https://${url}`;
                        // Falls ein Span für Text da ist, befüllen, sonst direkt ins <a>
                        const labelEl = a.querySelector('span') || a;
                        if (labelEl.tagName !== 'IMG') labelEl.textContent = label;
                        wrapper.style.display = 'flex';
                    } else {
                        wrapper.style.display = 'none';
                    }
                };

                fillSocial('.facebook-wrapper', point.social?.facebook, "Facebook");
                fillSocial('.instagram-wrapper', point.social?.instagram, "Instagram");
                fillSocial('.linkedin-wrapper', point.social?.linkedin, "LinkedIn");

                // Download
                const dl = point.download;
                const dlWrapper = clone.querySelector('.download-wrapper');
                if (dl && dl.url && dl.url.trim() !== "") {
                    const dlA = dlWrapper.querySelector('.download');
                    dlA.href = dl.url;
                    dlA.textContent = dl.text || "Download / PDF";
                } else {
                    dlWrapper.style.display = 'none';
                }

                contactList.appendChild(clone);
            });
        }
    };

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
