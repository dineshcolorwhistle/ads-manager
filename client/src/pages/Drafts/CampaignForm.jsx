import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import campaignService from '../../services/campaignService';
import platformService from '../../services/platformService';
import authService from '../../services/authService';
import clientService from '../../services/clientService';
import './CampaignForm.css';

const CampaignForm = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const isEdit = !!id;
    const isAdmin = authService.getCurrentUser()?.role === 'ADMIN';

    const defaultTargeting = () => ({ countries: ['US'], age_min: 18, age_max: 65, genders: [] });
    const MAX_HEADLINES = 5;
    const MAX_DESCRIPTIONS = 4;
    const defaultCreative = () => ({
        name: 'Text Creative 1',
        headlines: [{ text: '' }],
        descriptions: [{ text: '' }],
        final_urls: [''],
        call_to_action_type: 'LEARN_MORE',
        image_url: '',
        image_filename: ''
    });
    const [formData, setFormData] = useState({
        name: '',
        platform: '',
        objective: 'TRAFFIC',
        budget: { amount: 0, type: 'DAILY' },
        start_date: new Date().toISOString().split('T')[0],
        currency: 'USD',
        status: 'DRAFT',
        platform_account_id: '',
        facebook_page_id: '',
        client_id: '', // used by admin when creating campaign for a client
        ad_groups: [
            {
                name: 'Default Ad Group',
                targeting: defaultTargeting(),
                creatives: [defaultCreative()]
            }
        ]
    });

    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState([]);
    const [clientsLoading, setClientsLoading] = useState(false);
    const [connectedPlatforms, setConnectedPlatforms] = useState([]);
    const [platformsLoading, setPlatformsLoading] = useState(true);
    const [platformAccounts, setPlatformAccounts] = useState([]);
    const [platformAccountsLoading, setPlatformAccountsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    const [insights, setInsights] = useState(null);
    const [insightsError, setInsightsError] = useState(null);
    const [uploadingImage, setUploadingImage] = useState({});
    const [failureBanner, setFailureBanner] = useState(null);
    const messageTimerRef = useRef(null);

    // Auto-clear transient messages
    useEffect(() => {
        if (!error && !success) return;
        if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
        messageTimerRef.current = setTimeout(() => {
            setError(null);
            setSuccess(null);
        }, 5000);
        return () => {
            if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
        };
    }, [error, success]);

    // Auto-hide publish failure banner (failure_reason lives on the campaign model, so we keep a transient UI copy)
    useEffect(() => {
        if (formData.status !== 'FAILED' || !formData.failure_reason) return;
        setFailureBanner(formData.failure_reason);
        const t = setTimeout(() => setFailureBanner(null), 5000);
        return () => clearTimeout(t);
    }, [formData.status, formData.failure_reason]);

    // Pre-fill client from URL when admin creates campaign (e.g. from Admin Clients "Create campaign")
    useEffect(() => {
        if (!isAdmin || isEdit) return;
        const clientIdFromUrl = searchParams.get('client_id');
        if (clientIdFromUrl) {
            setFormData(prev => ({ ...prev, client_id: clientIdFromUrl }));
        }
    }, [isAdmin, isEdit, searchParams]);

    // Fetch clients for admin when creating new campaign
    useEffect(() => {
        if (!isAdmin || isEdit) return;
        const fetchClients = async () => {
            try {
                setClientsLoading(true);
                const res = await clientService.getClients();
                if (res.success && res.data) setClients(res.data);
            } catch (err) {
                console.error('Failed to fetch clients', err);
                setClients([]);
            } finally {
                setClientsLoading(false);
            }
        };
        fetchClients();
    }, [isAdmin, isEdit]);

    // Fetch connected platforms on mount for client users or when editing.
    // For admin creating a new campaign, platforms are loaded after a client is selected.
    useEffect(() => {
        if (isAdmin && !isEdit) {
            setConnectedPlatforms([]);
            setPlatformsLoading(false);
            return;
        }

        const fetchConnectedPlatforms = async () => {
            try {
                setPlatformsLoading(true);
                const platforms = await platformService.getConnectedPlatforms();
                setConnectedPlatforms(platforms || []);

                // Auto-select first connected platform if creating new (not editing)
                if (!isEdit && platforms && platforms.length > 0) {
                    setFormData(prev => {
                        const next = {
                            ...prev,
                            platform: platforms[0].platform,
                            platform_account_id: platforms[0].platform_account_id
                        };

                        if (platforms[0].platform === 'meta') {
                            const metaAccounts = platformAccounts.filter(a => a.platform === 'meta');
                            const preferred = localStorage.getItem('preferred_meta_account_id');
                            const preferredExists = preferred && metaAccounts.some(a => a.platform_account_id === preferred);
                            if (preferredExists) {
                                next.platform_account_id = preferred;
                            } else if (metaAccounts.length > 0) {
                                // If the connected credential's account id is stale/first-found,
                                // default to the first discovered account but keep it selectable.
                                next.platform_account_id = metaAccounts[0].platform_account_id;
                            }
                        }

                        if (platforms[0].platform === 'google') {
                            const googleAccounts = platformAccounts.filter(a => a.platform === 'google');
                            const preferred = localStorage.getItem('preferred_google_account_id');
                            const preferredExists = preferred && googleAccounts.some(a => a.platform_account_id === preferred);
                            if (preferredExists) {
                                next.platform_account_id = preferred;
                            } else if (googleAccounts.length > 0) {
                                next.platform_account_id = googleAccounts[0].platform_account_id;
                            }
                        }

                        return next;
                    });
                }
            } catch (err) {
                console.error('Failed to fetch connected platforms', err);
                setConnectedPlatforms([]);
            } finally {
                setPlatformsLoading(false);
            }
        };
        fetchConnectedPlatforms();
    }, [isAdmin, isEdit, platformAccounts]);

    // Fetch discovered platform accounts (used for Meta ad account selection)
    useEffect(() => {
        // For admin "create new" flows, the accounts endpoint is not client-scoped today.
        // Avoid fetching until a better admin-scoped endpoint exists.
        if (isAdmin && !isEdit) return;

        const fetchAccounts = async () => {
            try {
                setPlatformAccountsLoading(true);
                const accounts = await platformService.getAccounts();
                setPlatformAccounts(Array.isArray(accounts) ? accounts : []);
            } catch (err) {
                console.error('Failed to fetch platform accounts', err);
                setPlatformAccounts([]);
            } finally {
                setPlatformAccountsLoading(false);
            }
        };

        fetchAccounts();
    }, [isAdmin, isEdit]);

    // When admin is creating a campaign for a client, load that client's connected platforms
    useEffect(() => {
        if (!isAdmin || isEdit || !formData.client_id) return;

        const fetchClientPlatforms = async () => {
            try {
                setPlatformsLoading(true);
                const platforms = await platformService.getConnectedPlatforms(formData.client_id);
                setConnectedPlatforms(platforms || []);

                setFormData(prev => ({
                    ...prev,
                    platform: platforms && platforms.length > 0 ? platforms[0].platform : '',
                    platform_account_id: platforms && platforms.length > 0 ? platforms[0].platform_account_id : '',
                    facebook_page_id: platforms && platforms.length > 0 && prev.platform === 'meta' ? prev.facebook_page_id : ''
                }));
            } catch (err) {
                console.error('Failed to fetch connected platforms for client', err);
                setConnectedPlatforms([]);
                setFormData(prev => ({
                    ...prev,
                    platform: '',
                    platform_account_id: ''
                }));
            } finally {
                setPlatformsLoading(false);
            }
        };

        fetchClientPlatforms();
    }, [isAdmin, isEdit, formData.client_id]);

    // When admin is editing an existing campaign, hydrate platform list for that campaign's client
    useEffect(() => {
        if (!isAdmin || !isEdit || !formData.client_id) return;

        const fetchPlatformsForExisting = async () => {
            try {
                setPlatformsLoading(true);
                const platforms = await platformService.getConnectedPlatforms(formData.client_id);
                setConnectedPlatforms(platforms || []);
            } catch (err) {
                console.error('Failed to fetch connected platforms for existing campaign client', err);
                setConnectedPlatforms([]);
            } finally {
                setPlatformsLoading(false);
            }
        };

        fetchPlatformsForExisting();
    }, [isAdmin, isEdit, formData.client_id]);

    // Load draft data if editing
    useEffect(() => {
        if (isEdit) {
            loadDraft();
        }
    }, [id]);

    // Poll for publishing status
    useEffect(() => {
        let pollInterval;
        let retryCount = 0;
        const MAX_RETRIES = 60; // Stop after ~5 minutes (60 * 5s)

        if (formData.status === 'PUBLISHING') {
            pollInterval = setInterval(async () => {
                retryCount++;
                if (retryCount > MAX_RETRIES) {
                    clearInterval(pollInterval);
                    setError('Publishing status check timed out. Please refresh the page.');
                    return;
                }
                try {
                    const response = await campaignService.getDraft(id);
                    const data = response.data;
                    if (data.start_date) {
                        data.start_date = new Date(data.start_date).toISOString().split('T')[0];
                    }
                    if (!data.ad_groups || data.ad_groups.length === 0) {
                        data.ad_groups = [{ name: '', targeting: defaultTargeting(), creatives: [defaultCreative()] }];
                    }
                    normalizeAdGroupsForUI(data);
                    setFormData(data);
                    // Stop polling once status is no longer PUBLISHING
                    if (data.status !== 'PUBLISHING') {
                        clearInterval(pollInterval);

                        // When publishing completes successfully, show a short success
                        // message and redirect back to drafts.
                        if (data.status === 'ACTIVE') {
                            setSuccess('Campaign published successfully. Redirecting to drafts...');
                            setTimeout(() => navigate('/drafts'), 2000);
                        }
                    }
                } catch (err) {
                    // Don't show error during background polling to avoid confusing UI
                    console.error('Poll failed:', err);
                }
            }, 5000);
        }
        return () => clearInterval(pollInterval);
    }, [formData.status]);

    const normalizeAdGroupsForUI = (data) => {
        if (!data.ad_groups) return;
        data.ad_groups.forEach(ag => {
            if (!ag.targeting || !Array.isArray(ag.targeting.countries)) {
                ag.targeting = defaultTargeting();
            }
            (ag.creatives || []).forEach(c => {
                if (!Array.isArray(c.headlines) || c.headlines.length === 0) c.headlines = [{ text: '' }];
                if (!Array.isArray(c.descriptions) || c.descriptions.length === 0) c.descriptions = [{ text: '' }];
                if (!Array.isArray(c.final_urls) || c.final_urls.length === 0) c.final_urls = [''];
                if (c.call_to_action_type === undefined || c.call_to_action_type === null) c.call_to_action_type = 'LEARN_MORE';
            });
        });
    };

    const loadDraft = async () => {
        try {
            setLoading(true);
            const response = await campaignService.getDraft(id);
            const data = response.data;
            if (data.start_date) {
                data.start_date = new Date(data.start_date).toISOString().split('T')[0];
            }
            if (!data.ad_groups || data.ad_groups.length === 0) {
                data.ad_groups = [{ name: '', targeting: defaultTargeting(), creatives: [defaultCreative()] }];
            }
            normalizeAdGroupsForUI(data);
            setFormData(data);
            setInsights(null);
            setInsightsError(null);
        } catch (err) {
            setError('Failed to load draft details.');
        } finally {
            setLoading(false);
        }
    };

    // --- Validation ---
    const validateForm = () => {
        const errors = {};

        if (isAdmin && !isEdit && (!formData.client_id || formData.client_id.trim() === '')) {
            errors.client_id = 'Please select which client this campaign belongs to';
        }

        if (!formData.name || formData.name.trim() === '') {
            errors.name = 'Campaign name is required';
        }

        if (!formData.platform) {
            errors.platform = 'Platform selection is required';
        }

        if (!formData.objective) {
            errors.objective = 'Campaign objective is required';
        }

        if (!formData.budget || !formData.budget.amount || Number(formData.budget.amount) <= 0) {
            errors.budget = 'Budget amount must be greater than 0';
        }

        if (!formData.start_date) {
            errors.start_date = 'Start date is required';
        } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startDate = new Date(formData.start_date);
            if (!isEdit && startDate < today) {
                errors.start_date = 'Start date cannot be in the past';
            }
        }

        if (!formData.platform_account_id) {
            errors.platform_account_id = 'No ad account assigned. Please select a connected platform.';
        }

        if (formData.platform === 'meta' && (!formData.facebook_page_id || formData.facebook_page_id.trim() === '')) {
            errors.facebook_page_id = 'Facebook Page ID is required when publishing to Meta';
        }

        // Validate ad groups
        if (formData.ad_groups && formData.ad_groups.length > 0) {
            const agErrors = [];
            formData.ad_groups.forEach((ag, agIndex) => {
                const agErr = {};
                if (!ag.name || ag.name.trim() === '') {
                    agErr.name = 'Ad group name is required';
                }
                // Validate creatives
                if (ag.creatives && ag.creatives.length > 0) {
                    const cErrors = [];
                    ag.creatives.forEach((creative, cIndex) => {
                        const cErr = {};
                        const hasHeadline = creative.headlines && creative.headlines.some(h => h.text && h.text.trim() !== '');
                        const hasDescription = creative.descriptions && creative.descriptions.some(d => d.text && d.text.trim() !== '');
                        if (!hasHeadline) {
                            cErr.headlines = 'At least one headline is required';
                        }
                        if (!hasDescription) {
                            cErr.descriptions = 'At least one description is required';
                        }
                        if (formData.platform === 'meta') {
                            const urls = creative.final_urls && Array.isArray(creative.final_urls)
                                ? creative.final_urls.filter(u => u && String(u).trim() !== '')
                                : [];
                            if (urls.length === 0) {
                                cErr.final_urls = 'At least one destination URL is required for Meta';
                            }
                        }
                        if (Object.keys(cErr).length > 0) {
                            cErrors[cIndex] = cErr;
                        }
                    });
                    if (Object.keys(cErrors).length > 0) {
                        agErr.creatives = cErrors;
                    }
                }
                if (Object.keys(agErr).length > 0) {
                    agErrors[agIndex] = agErr;
                }
            });
            if (Object.keys(agErrors).length > 0) {
                errors.ad_groups = agErrors;
            }
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // --- Handlers ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        // Clear validation error for this field
        setValidationErrors(prev => ({ ...prev, [name]: undefined }));

        if (name.startsWith('budget.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                budget: { ...prev.budget, [field]: value }
            }));
            if (field === 'amount') {
                setValidationErrors(prev => ({ ...prev, budget: undefined }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handlePlatformChange = (e) => {
        const selectedPlatform = e.target.value;
        const platformData = connectedPlatforms.find(p => p.platform === selectedPlatform);

        setValidationErrors(prev => ({ ...prev, platform: undefined, platform_account_id: undefined }));
        setFormData(prev => {
            const next = {
                ...prev,
                platform: selectedPlatform,
                platform_account_id: platformData ? platformData.platform_account_id : ''
            };

            // Meta can have multiple discovered ad accounts. Prefer:
            // 1) a saved preference, if still available
            // 2) the platform's current connected account id (from credentials)
            // 3) the first discovered Meta account
            if (selectedPlatform === 'meta') {
                const metaAccounts = platformAccounts.filter(a => a.platform === 'meta');
                const preferred = localStorage.getItem('preferred_meta_account_id');
                const preferredExists = preferred && metaAccounts.some(a => a.platform_account_id === preferred);
                if (preferredExists) {
                    next.platform_account_id = preferred;
                } else if (platformData && metaAccounts.some(a => a.platform_account_id === platformData.platform_account_id)) {
                    next.platform_account_id = platformData.platform_account_id;
                } else if (metaAccounts.length > 0) {
                    next.platform_account_id = metaAccounts[0].platform_account_id;
                }
            }

            // Google can have multiple accessible accounts. Prefer:
            // 1) a saved preference, if still available
            // 2) the platform's current connected account id (from credentials)
            // 3) the first discovered Google account
            if (selectedPlatform === 'google') {
                const googleAccounts = platformAccounts.filter(a => a.platform === 'google');
                const preferred = localStorage.getItem('preferred_google_account_id');
                const preferredExists = preferred && googleAccounts.some(a => a.platform_account_id === preferred);
                if (preferredExists) {
                    next.platform_account_id = preferred;
                } else if (platformData && googleAccounts.some(a => a.platform_account_id === platformData.platform_account_id)) {
                    next.platform_account_id = platformData.platform_account_id;
                } else if (googleAccounts.length > 0) {
                    next.platform_account_id = googleAccounts[0].platform_account_id;
                }
            }

            return next;
        });
    };

    const handleMetaAccountChange = (e) => {
        const value = e.target.value;
        setValidationErrors(prev => ({ ...prev, platform_account_id: undefined }));
        setFormData(prev => ({ ...prev, platform_account_id: value }));
        if (value) localStorage.setItem('preferred_meta_account_id', value);
    };

    const handleGoogleAccountChange = (e) => {
        const value = e.target.value;
        setValidationErrors(prev => ({ ...prev, platform_account_id: undefined }));
        setFormData(prev => ({ ...prev, platform_account_id: value }));
        if (value) localStorage.setItem('preferred_google_account_id', value);
    };

    const handleAdGroupChange = (index, field, value) => {
        const newAdGroups = [...formData.ad_groups];
        newAdGroups[index] = { ...newAdGroups[index], [field]: value };
        setFormData(prev => ({ ...prev, ad_groups: newAdGroups }));
        // Clear validation error
        setValidationErrors(prev => {
            const agErrors = { ...(prev.ad_groups || {}) };
            if (agErrors[index]) {
                const { [field]: _, ...rest } = agErrors[index];
                agErrors[index] = rest;
            }
            return { ...prev, ad_groups: Object.keys(agErrors).length > 0 ? agErrors : undefined };
        });
    };

    const addAdGroup = () => {
        setFormData(prev => ({
            ...prev,
            ad_groups: [...prev.ad_groups, { name: '', targeting: defaultTargeting(), creatives: [defaultCreative()] }]
        }));
    };

    const handleTargetingChange = (agIndex, key, value) => {
        const newAdGroups = [...formData.ad_groups];
        const ag = newAdGroups[agIndex];
        ag.targeting = ag.targeting || defaultTargeting();
        if (key === 'countries') {
            ag.targeting.countries = value ? String(value).split(',').map(c => c.trim().toUpperCase()).filter(Boolean) : ['US'];
        } else if (key === 'genders') {
            ag.targeting.genders = value === 'male' ? [1] : value === 'female' ? [2] : [];
        } else {
            ag.targeting[key] = value === '' || value == null ? undefined : Number(value);
        }
        setFormData(prev => ({ ...prev, ad_groups: newAdGroups }));
    };

    const handleCreativeChange = (agIndex, cIndex, field, value, itemIndex) => {
        const newAdGroups = [...formData.ad_groups];
        const creative = { ...newAdGroups[agIndex].creatives[cIndex] };

        if (field === 'headlines' || field === 'descriptions') {
            const newList = [...creative[field]];
            newList[itemIndex] = { ...newList[itemIndex], text: value };
            creative[field] = newList;
        } else if (field === 'final_urls') {
            const newList = [...(creative.final_urls || [''])];
            if (itemIndex >= newList.length) newList.length = itemIndex + 1;
            newList[itemIndex] = value;
            creative.final_urls = newList;
        } else {
            creative[field] = value;
        }

        newAdGroups[agIndex].creatives[cIndex] = creative;
        setFormData(prev => ({ ...prev, ad_groups: newAdGroups }));
    };

    const addTextField = (agIndex, cIndex, field) => {
        const newAdGroups = [...formData.ad_groups];
        const creative = { ...newAdGroups[agIndex].creatives[cIndex] };
        const list = Array.isArray(creative[field]) ? creative[field] : [{ text: '' }];
        const max = field === 'headlines' ? MAX_HEADLINES : field === 'descriptions' ? MAX_DESCRIPTIONS : Infinity;
        if (list.length >= max) return;
        creative[field] = [...list, { text: '' }];
        newAdGroups[agIndex].creatives[cIndex] = creative;
        setFormData(prev => ({ ...prev, ad_groups: newAdGroups }));
    };

    const removeTextField = (agIndex, cIndex, field, itemIndex) => {
        const newAdGroups = [...formData.ad_groups];
        const creative = { ...newAdGroups[agIndex].creatives[cIndex] };

        if (creative[field].length > 1) {
            creative[field] = creative[field].filter((_, idx) => idx !== itemIndex);
            newAdGroups[agIndex].creatives[cIndex] = creative;
            setFormData(prev => ({ ...prev, ad_groups: newAdGroups }));
        }
    };

    const handleImageUpload = async (agIndex, cIndex, file) => {
        if (!file) return;
        const key = `${agIndex}-${cIndex}`;
        setUploadingImage(prev => ({ ...prev, [key]: true }));
        try {
            const result = await campaignService.uploadImage(file);
            const { image_url, filename } = result.data;
            const newAdGroups = [...formData.ad_groups];
            const creative = { ...newAdGroups[agIndex].creatives[cIndex] };
            creative.image_url = image_url;
            creative.image_filename = filename;
            newAdGroups[agIndex].creatives[cIndex] = creative;
            setFormData(prev => ({ ...prev, ad_groups: newAdGroups }));
        } catch (err) {
            setError(err.message || 'Failed to upload image');
        } finally {
            setUploadingImage(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleRemoveImage = (agIndex, cIndex) => {
        const newAdGroups = [...formData.ad_groups];
        const creative = { ...newAdGroups[agIndex].creatives[cIndex] };
        creative.image_url = '';
        creative.image_filename = '';
        newAdGroups[agIndex].creatives[cIndex] = creative;
        setFormData(prev => ({ ...prev, ad_groups: newAdGroups }));
    };

    const removeAdGroup = (index) => {
        if (formData.ad_groups.length > 1) {
            const newAdGroups = formData.ad_groups.filter((_, idx) => idx !== index);
            setFormData(prev => ({ ...prev, ad_groups: newAdGroups }));
        }
    };

    const handleSubmit = async (e, forceStatus) => {
        if (e) e.preventDefault();

        // Run validation
        if (!validateForm()) {
            setError('Please fix the validation errors below before saving.');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const dataToSave = {
                ...formData,
                status: forceStatus || formData.status
            };
            // Admin creating for a client: ensure client_id is sent (backend expects it in body)
            if (isAdmin && !isEdit && formData.client_id) {
                dataToSave.client_id = formData.client_id;
            }

            await campaignService.saveFull(dataToSave);
            setSuccess('Campaign saved successfully!');

            if (forceStatus === 'DRAFT' || forceStatus === 'READY') {
                setTimeout(() => navigate('/drafts'), 1500);
            } else {
                loadDraft();
            }
        } catch (err) {
            setError(err.message || 'Failed to save campaign structure.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this campaign? This will also remove it from the advertising platform if published.')) {
            return;
        }

        try {
            setLoading(true);
            setError(null);
            await campaignService.delete(id);
            setSuccess('Campaign deleted successfully. Redirecting...');
            setTimeout(() => navigate('/drafts'), 1500);
        } catch (err) {
            setError(err.message || 'Failed to delete campaign.');
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        try {
            setLoading(true);
            setError(null);
            await campaignService.publish(id);
            setSuccess('Publishing process started.');
            loadDraft();
        } catch (err) {
            setError(err.message || 'Failed to trigger publishing.');
        } finally {
            setLoading(false);
        }
    };

    const handleStop = async () => {
        if (!window.confirm('Are you sure you want to stop this campaign on the advertising platform?')) {
            return;
        }
        try {
            setLoading(true);
            setError(null);
            await campaignService.stop(id);
            setSuccess('Campaign stop requested. It may take a moment to reflect on the platform.');
            await loadDraft();
        } catch (err) {
            setError(err.message || 'Failed to stop campaign.');
        } finally {
            setLoading(false);
        }
    };

    const handleLoadInsights = async () => {
        if (!id) return;
        try {
            setInsightsError(null);
            const result = await campaignService.getInsights(id);
            setInsights(result.data || null);
        } catch (err) {
            setInsights(null);
            setInsightsError(err.message || 'Failed to load insights.');
        }
    };

    // --- Helpers ---
    const getSelectedPlatformLabel = () => {
        const found = connectedPlatforms.find(p => p.platform === formData.platform);
        return found ? found.label : '';
    };

    const noPlatformsConnected = !platformsLoading && connectedPlatforms.length === 0;

    if (loading && isEdit && !formData.name) {
        return (
            <div className="form-loading-shell">
                <div className="form-loading-card">
                    <div className="form-loading-title" />
                    <div className="form-loading-line" />
                    <div className="form-loading-block" />
                </div>
            </div>
        );
    }

    return (
        <div className="form-container">
            <header className="form-header">
                <div className="form-header-main">
                    <h1>{isEdit ? 'Edit Campaign Draft' : 'Create New Campaign'}</h1>
                    <p className="form-subtitle">
                        {isEdit
                            ? 'Update campaign details, ad groups, and creatives. Save as draft or set to ready for publishing.'
                            : 'Set up your campaign name, platform, budget, and ad creatives in one place.'}
                    </p>
                    <div className="form-header-badges">
                        {isEdit && (
                            <span className={`status-badge status-${formData.status.toLowerCase()}`}>
                                {formData.status}
                            </span>
                        )}
                        {isEdit && formData.created_by && (
                            <span className="creator-badge">
                                {formData.created_by.name}
                            </span>
                        )}
                    </div>
                </div>
                {isEdit && (authService.getCurrentUser()?.role === 'ADMIN' || authService.getCurrentUser()?.role === 'CLIENT') && (
                    <button type="button" onClick={handleDelete} disabled={loading} className="btn-delete">
                        Delete Campaign
                    </button>
                )}
            </header>

            <form className="campaign-form">
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}
                {formData.status === 'FAILED' && failureBanner && (
                    <div className="failure-banner">
                        <strong>Publish Failed:</strong> {failureBanner}
                    </div>
                )}

                {/* For admin creating a client campaign, hide the global "No Platforms Connected" banner.
                    The platform list will update based on the selected client instead. */}
                {noPlatformsConnected && !(isAdmin && !isEdit) && (
                    <div className="no-platforms-warning">
                        <div className="warning-icon">⚠️</div>
                        <div className="warning-content">
                            <strong>No Platforms Connected</strong>
                            <p>Connect at least one advertising platform before creating a campaign.</p>
                            <button type="button" className="btn-connect-link" onClick={() => navigate('/platforms')}>
                                Go to Platforms →
                            </button>
                        </div>
                    </div>
                )}

                <section className="form-section form-section-card">
                    <div className="form-section-header">
                        <h2>1. Campaign Details</h2>
                        <p className="form-section-subtitle">Name, platform, objective, budget, and schedule.</p>
                    </div>
                    {isAdmin && !isEdit && (
                        <div className="form-group">
                            <label>Create campaign for client <span className="required">*</span></label>
                            {clientsLoading ? (
                                <div className="platform-loading">
                                    <div className="spinner-small"></div>
                                    <span>Loading clients…</span>
                                </div>
                            ) : (
                                <>
                                    <select
                                        name="client_id"
                                        value={formData.client_id || ''}
                                        onChange={handleChange}
                                        className={validationErrors.client_id ? 'input-error' : ''}
                                    >
                                        <option value="">— Select client —</option>
                                        {clients.map(c => (
                                            <option key={c._id} value={c._id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                    {validationErrors.client_id && (
                                        <span className="field-error">{validationErrors.client_id}</span>
                                    )}
                                    <small>Choose which client this campaign will belong to.</small>
                                </>
                            )}
                        </div>
                    )}
                    <div className="form-group">
                        <label>Campaign Name <span className="required">*</span></label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g. Summer Sale 2026"
                            className={validationErrors.name ? 'input-error' : ''}
                        />
                        {validationErrors.name && <span className="field-error">{validationErrors.name}</span>}
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Select Platform <span className="required">*</span></label>
                            {platformsLoading ? (
                                <div className="platform-loading">
                                    <div className="spinner-small"></div>
                                    <span>Detecting connected platforms...</span>
                                </div>
                            ) : (
                                <>
                                    <select
                                        name="platform"
                                        value={formData.platform}
                                        onChange={handlePlatformChange}
                                        disabled={noPlatformsConnected}
                                        className={validationErrors.platform ? 'input-error' : ''}
                                    >
                                        {noPlatformsConnected && (
                                            <option value="">No platforms connected</option>
                                        )}
                                        {connectedPlatforms.map(p => (
                                            <option key={p.platform} value={p.platform}>
                                                {p.label}
                                            </option>
                                        ))}
                                    </select>
                                    {validationErrors.platform && <span className="field-error">{validationErrors.platform}</span>}
                                    {formData.platform && formData.platform_account_id && (
                                        <div className="platform-connected-badge">
                                            <span className="connected-dot"></span>
                                            Connected — Account: <strong>{formData.platform_account_id}</strong>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="form-group">
                            <label>Objective <span className="required">*</span></label>
                            <select
                                name="objective"
                                value={formData.objective}
                                onChange={handleChange}
                                className={validationErrors.objective ? 'input-error' : ''}
                            >
                                <option value="TRAFFIC">Traffic</option>
                                <option value="LEADS">Leads</option>
                                <option value="SALES">Sales</option>
                                <option value="AWARENESS">Awareness</option>
                            </select>
                            {validationErrors.objective && <span className="field-error">{validationErrors.objective}</span>}
                        </div>
                    </div>

                    {formData.platform === 'meta' && (
                        <div className="form-row">
                            <div className="form-group">
                                <label>Meta Ad Account <span className="required">*</span></label>
                                {platformAccountsLoading ? (
                                    <div className="platform-loading">
                                        <div className="spinner-small"></div>
                                        <span>Loading Meta accounts…</span>
                                    </div>
                                ) : (
                                    <>
                                        <select
                                            value={formData.platform_account_id || ''}
                                            onChange={handleMetaAccountChange}
                                            className={validationErrors.platform_account_id ? 'input-error' : ''}
                                        >
                                            <option value="">— Select ad account —</option>
                                            {platformAccounts
                                                .filter(a => a.platform === 'meta')
                                                .map(acc => (
                                                    <option key={acc._id || acc.platform_account_id} value={acc.platform_account_id}>
                                                        {acc.name} ({acc.platform_account_id})
                                                    </option>
                                                ))}
                                        </select>
                                        {validationErrors.platform_account_id && (
                                            <span className="field-error">{validationErrors.platform_account_id}</span>
                                        )}
                                        <small>Choose which Meta ad account this campaign will publish to.</small>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {formData.platform === 'google' && (
                        <div className="form-row">
                            <div className="form-group">
                                <label>Google Ads Account <span className="required">*</span></label>
                                {platformAccountsLoading ? (
                                    <div className="platform-loading">
                                        <div className="spinner-small"></div>
                                        <span>Loading Google accounts…</span>
                                    </div>
                                ) : (
                                    <>
                                        <select
                                            value={formData.platform_account_id || ''}
                                            onChange={handleGoogleAccountChange}
                                            className={validationErrors.platform_account_id ? 'input-error' : ''}
                                        >
                                            <option value="">— Select ad account —</option>
                                            {platformAccounts
                                                .filter(a => a.platform === 'google')
                                                .map(acc => (
                                                    <option key={acc._id || acc.platform_account_id} value={acc.platform_account_id}>
                                                        {acc.name} ({acc.platform_account_id})
                                                    </option>
                                                ))}
                                        </select>
                                        {validationErrors.platform_account_id && (
                                            <span className="field-error">{validationErrors.platform_account_id}</span>
                                        )}
                                        <small>Choose which Google Ads account this campaign will publish to.</small>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {formData.platform === 'meta' && (
                        <div className="form-row">
                            <div className="form-group">
                                <label>Facebook Page ID <span className="required">*</span></label>
                                <input
                                    name="facebook_page_id"
                                    value={formData.facebook_page_id || ''}
                                    onChange={handleChange}
                                    placeholder="e.g. 61587822848468"
                                    className={validationErrors.facebook_page_id ? 'input-error' : ''}
                                />
                                {validationErrors.facebook_page_id && <span className="field-error">{validationErrors.facebook_page_id}</span>}
                                <small>The specific Facebook Page ID this campaign will advertise.</small>
                            </div>
                        </div>
                    )}

                    <div className="form-row">
                        <div className="form-group">
                            <label>Budget Type</label>
                            <select name="budget.type" value={formData.budget.type} onChange={handleChange}>
                                <option value="DAILY">Daily</option>
                                <option value="LIFETIME">Lifetime</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Currency</label>
                            <select name="currency" value={formData.currency} onChange={handleChange}>
                                <option value="USD">USD - US Dollar</option>
                                <option value="EUR">EUR - Euro</option>
                                <option value="GBP">GBP - British Pound</option>
                                <option value="INR">INR - Indian Rupee</option>
                                <option value="JPY">JPY - Japanese Yen</option>
                                <option value="AUD">AUD - Australian Dollar</option>
                                <option value="CAD">CAD - Canadian Dollar</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Budget Amount ({formData.currency}) <span className="required">*</span></label>
                            <input
                                type="number"
                                name="budget.amount"
                                value={formData.budget.amount}
                                onChange={handleChange}
                                min="1"
                                className={validationErrors.budget ? 'input-error' : ''}
                            />
                            {validationErrors.budget && <span className="field-error">{validationErrors.budget}</span>}
                        </div>
                        <div className="form-group">
                            <label>Start Date <span className="required">*</span></label>
                            <input
                                type="date"
                                name="start_date"
                                value={formData.start_date}
                                onChange={handleChange}
                                className={validationErrors.start_date ? 'input-error' : ''}
                            />
                            {validationErrors.start_date && <span className="field-error">{validationErrors.start_date}</span>}
                        </div>
                    </div>
                </section>

                <section className="form-section form-section-card">
                    <div className="form-section-header form-section-header-row">
                        <div>
                            <h2>2. Ad Groups & Creatives</h2>
                            <p className="form-section-subtitle">Ad group names and headline/description copy for your ads.</p>
                        </div>
                        <button type="button" className="btn-secondary" onClick={addAdGroup}>+ Add Ad Group</button>
                    </div>

                    {formData.ad_groups.map((ag, agIndex) => (
                        <div key={agIndex} className="ad-group-block">
                            <div className="section-header-compact">
                                <h3>Ad Group {agIndex + 1}</h3>
                                {formData.ad_groups.length > 1 && (
                                    <button type="button" className="btn-remove-link" onClick={() => removeAdGroup(agIndex)}>Remove Ad Group</button>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Ad Group Name <span className="required">*</span></label>
                                <input
                                    value={ag.name}
                                    onChange={(e) => handleAdGroupChange(agIndex, 'name', e.target.value)}
                                    placeholder="e.g. Jeans - Summer Promo"
                                    className={validationErrors.ad_groups?.[agIndex]?.name ? 'input-error' : ''}
                                />
                                {validationErrors.ad_groups?.[agIndex]?.name && (
                                    <span className="field-error">{validationErrors.ad_groups[agIndex].name}</span>
                                )}
                            </div>

                            {formData.platform === 'meta' && (
                                <div className="form-row targeting-row">
                                    <div className="form-group">
                                        <label>Targeting: Countries</label>
                                        <input
                                            value={(ag.targeting && ag.targeting.countries) ? ag.targeting.countries.join(', ') : 'US'}
                                            onChange={(e) => handleTargetingChange(agIndex, 'countries', e.target.value)}
                                            placeholder="e.g. US, GB, CA"
                                        />
                                        <small>Comma-separated country codes (e.g. US, GB)</small>
                                    </div>
                                    <div className="form-group">
                                        <label>Age min</label>
                                        <input
                                            type="number"
                                            min={13}
                                            max={65}
                                            value={ag.targeting?.age_min ?? 18}
                                            onChange={(e) => handleTargetingChange(agIndex, 'age_min', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Age max</label>
                                        <input
                                            type="number"
                                            min={13}
                                            max={65}
                                            value={ag.targeting?.age_max ?? 65}
                                            onChange={(e) => handleTargetingChange(agIndex, 'age_max', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Gender</label>
                                        <select
                                            value={ag.targeting?.genders?.length === 1 ? (ag.targeting.genders[0] === 1 ? 'male' : 'female') : 'all'}
                                            onChange={(e) => handleTargetingChange(agIndex, 'genders', e.target.value)}
                                        >
                                            <option value="all">All</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {ag.creatives.map((creative, cIndex) => (
                                <div key={cIndex} className="creative-block">
                                    <h3>Text Creative</h3>

                                    <div className="text-field-group">
                                        <label>Headlines <span className="required">*</span></label>
                                        {creative.headlines.map((h, hIndex) => (
                                            <div key={hIndex} className="input-with-action">
                                                <input
                                                    value={h.text}
                                                    onChange={(e) => handleCreativeChange(agIndex, cIndex, 'headlines', e.target.value, hIndex)}
                                                    placeholder={`Headline ${hIndex + 1}`}
                                                    className={validationErrors.ad_groups?.[agIndex]?.creatives?.[cIndex]?.headlines ? 'input-error' : ''}
                                                />
                                                {creative.headlines.length > 1 && (
                                                    <button type="button" className="btn-remove-icon" onClick={() => removeTextField(agIndex, cIndex, 'headlines', hIndex)}>×</button>
                                                )}
                                            </div>
                                        ))}
                                        {validationErrors.ad_groups?.[agIndex]?.creatives?.[cIndex]?.headlines && (
                                            <span className="field-error">{validationErrors.ad_groups[agIndex].creatives[cIndex].headlines}</span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => addTextField(agIndex, cIndex, 'headlines')}
                                            className="btn-text-only"
                                            disabled={(creative.headlines?.length || 0) >= MAX_HEADLINES}
                                        >
                                            + Add Headline
                                        </button>
                                        <small>{(creative.headlines?.length || 0)}/{MAX_HEADLINES} headlines</small>
                                    </div>

                                    <div className="text-field-group">
                                        <label>Descriptions <span className="required">*</span></label>
                                        {creative.descriptions.map((d, dIndex) => (
                                            <div key={dIndex} className="input-with-action">
                                                <textarea
                                                    value={d.text}
                                                    onChange={(e) => handleCreativeChange(agIndex, cIndex, 'descriptions', e.target.value, dIndex)}
                                                    placeholder={`Description ${dIndex + 1}`}
                                                    className={validationErrors.ad_groups?.[agIndex]?.creatives?.[cIndex]?.descriptions ? 'input-error' : ''}
                                                />
                                                {creative.descriptions.length > 1 && (
                                                    <button type="button" className="btn-remove-icon" onClick={() => removeTextField(agIndex, cIndex, 'descriptions', dIndex)}>×</button>
                                                )}
                                            </div>
                                        ))}
                                        {validationErrors.ad_groups?.[agIndex]?.creatives?.[cIndex]?.descriptions && (
                                            <span className="field-error">{validationErrors.ad_groups[agIndex].creatives[cIndex].descriptions}</span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => addTextField(agIndex, cIndex, 'descriptions')}
                                            className="btn-text-only"
                                            disabled={(creative.descriptions?.length || 0) >= MAX_DESCRIPTIONS}
                                        >
                                            + Add Description
                                        </button>
                                        <small>{(creative.descriptions?.length || 0)}/{MAX_DESCRIPTIONS} descriptions</small>
                                    </div>

                                    <div className="text-field-group creative-destination-url">
                                        <label>
                                            Destination URL
                                            {formData.platform === 'meta' && <span className="required"> *</span>}
                                            {formData.platform === 'google' && <span className="label-hint"> (optional for Google Ads)</span>}
                                        </label>
                                        <input
                                            type="url"
                                            value={(creative.final_urls && creative.final_urls[0]) || ''}
                                            onChange={(e) => handleCreativeChange(agIndex, cIndex, 'final_urls', e.target.value, 0)}
                                            placeholder="https://example.com/landing"
                                            className={validationErrors.ad_groups?.[agIndex]?.creatives?.[cIndex]?.final_urls ? 'input-error' : ''}
                                        />
                                        {validationErrors.ad_groups?.[agIndex]?.creatives?.[cIndex]?.final_urls && (
                                            <span className="field-error">{validationErrors.ad_groups[agIndex].creatives[cIndex].final_urls}</span>
                                        )}
                                        <small>{formData.platform === 'meta' ? 'Required for Meta ads.' : 'Optional for Google Ads.'}</small>
                                    </div>

                                    {formData.platform === 'meta' && (
                                        <div className="text-field-group">
                                            <label>Ad Image (Meta)</label>
                                            {creative.image_url ? (
                                                <div className="image-preview-container">
                                                    <img src={campaignService.resolveImageUrl(creative.image_url)} alt="Ad creative" className="image-preview" />
                                                    <div className="image-preview-actions">
                                                        <span className="image-preview-name">{creative.image_filename || 'External image'}</span>
                                                        <button type="button" className="btn-remove-image" onClick={() => handleRemoveImage(agIndex, cIndex)}>Remove</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div
                                                    className={`image-upload-zone ${uploadingImage[`${agIndex}-${cIndex}`] ? 'uploading' : ''}`}
                                                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
                                                    onDragLeave={(e) => { e.currentTarget.classList.remove('drag-over'); }}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        e.currentTarget.classList.remove('drag-over');
                                                        const file = e.dataTransfer.files?.[0];
                                                        if (file) handleImageUpload(agIndex, cIndex, file);
                                                    }}
                                                    onClick={() => document.getElementById(`img-input-${agIndex}-${cIndex}`)?.click()}
                                                >
                                                    <input
                                                        id={`img-input-${agIndex}-${cIndex}`}
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/gif,image/webp"
                                                        style={{ display: 'none' }}
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleImageUpload(agIndex, cIndex, file);
                                                            e.target.value = '';
                                                        }}
                                                    />
                                                    {uploadingImage[`${agIndex}-${cIndex}`] ? (
                                                        <div className="upload-spinner-row">
                                                            <div className="spinner-small"></div>
                                                            <span>Uploading...</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="upload-icon">
                                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                                    <polyline points="17 8 12 3 7 8" />
                                                                    <line x1="12" y1="3" x2="12" y2="15" />
                                                                </svg>
                                                            </div>
                                                            <span className="upload-label">Click or drag an image here</span>
                                                            <span className="upload-hint">JPG, PNG, GIF, WebP up to 10 MB</span>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                            <small>Optional: Upload an image to use as the Meta ad creative.</small>
                                        </div>
                                    )}

                                    {formData.platform === 'meta' && (
                                        <div className="text-field-group">
                                            <label>Call to action</label>
                                            <select
                                                value={creative.call_to_action_type || 'LEARN_MORE'}
                                                onChange={(e) => handleCreativeChange(agIndex, cIndex, 'call_to_action_type', e.target.value)}
                                            >
                                                <option value="LEARN_MORE">Learn More</option>
                                                <option value="SHOP_NOW">Shop Now</option>
                                                <option value="SIGN_UP">Sign Up</option>
                                                <option value="CONTACT_US">Contact Us</option>
                                                <option value="GET_QUOTE">Get Quote</option>
                                                <option value="DOWNLOAD">Download</option>
                                                <option value="BOOK_NOW">Book Now</option>
                                                <option value="GET_OFFER">Get Offer</option>
                                                <option value="VISIT_WEBSITE">Visit Website</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </section>

                {isEdit && formData.platform === 'meta' && formData.external_id && (
                    <section className="form-section form-section-card">
                        <div className="form-section-header form-section-header-row">
                            <div>
                                <h2>3. Campaign Insights (Meta)</h2>
                                <p className="form-section-subtitle">Last 7 days of basic performance metrics from Meta.</p>
                            </div>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={handleLoadInsights}
                                disabled={loading}
                            >
                                Refresh Insights
                            </button>
                        </div>
                        {insightsError && <div className="error-message">{insightsError}</div>}
                        {Array.isArray(insights) && insights.length > 0 && (
                            <div className="insights-table-wrapper">
                                <table className="insights-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Impressions</th>
                                            <th>Clicks</th>
                                            <th>Spend</th>
                                            <th>CPC</th>
                                            <th>CTR</th>
                                            <th>Conversions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {insights.map((row, idx) => (
                                            <tr key={idx}>
                                                <td>{row.date_start === row.date_stop ? row.date_start : `${row.date_start} → ${row.date_stop}`}</td>
                                                <td>{row.impressions}</td>
                                                <td>{row.clicks}</td>
                                                <td>{row.spend}</td>
                                                <td>{row.cpc}</td>
                                                <td>{row.ctr}</td>
                                                <td>{row.conversions}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {!insights && !insightsError && (
                            <p className="form-section-subtitle">Click “Refresh Insights” to load the latest data from Meta.</p>
                        )}
                    </section>
                )}

                <div className="form-footer">
                    <button type="button" onClick={() => navigate('/drafts')} className="btn-cancel">
                        Cancel
                    </button>
                    <div className="form-footer-actions">
                        {formData.status === 'ACTIVE' && (authService.getCurrentUser()?.role === 'ADMIN' || authService.getCurrentUser()?.role === 'CLIENT') && (
                            <button
                                type="button"
                                onClick={handleStop}
                                disabled={loading}
                                className="btn-save-draft"
                            >
                                {loading ? 'Stopping...' : 'Stop Campaign'}
                            </button>
                        )}
                        {formData.status === 'READY' && (authService.getCurrentUser()?.role === 'ADMIN' || authService.getCurrentUser()?.role === 'CLIENT') && (
                            <button type="button" onClick={handlePublish} disabled={loading} className="btn-primary">
                                {loading ? 'Starting...' : 'Publish to Platform'}
                            </button>
                        )}
                        {(formData.status === 'DRAFT' || formData.status === 'READY' || formData.status === 'FAILED') && (
                            <>
                                <button type="button" onClick={(e) => handleSubmit(e, 'DRAFT')} disabled={loading || noPlatformsConnected} className="btn-save-draft">
                                    Save as Draft
                                </button>
                                <button type="button" onClick={(e) => handleSubmit(e, 'READY')} disabled={loading || noPlatformsConnected} className="btn-primary">
                                    {formData.status === 'READY' ? 'Update Ready' : 'Set to Ready'}
                                </button>
                            </>
                        )}
                        {formData.status === 'PUBLISHING' && (
                            <div className="publishing-spinner-container">
                                <div className="spinner"></div>
                                <span>Publishing in progress...</span>
                            </div>
                        )}
                    </div>
                </div>
            </form>
        </div >
    );
};

export default CampaignForm;
