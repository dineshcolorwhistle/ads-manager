import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import campaignService from '../../services/campaignService';
import platformService from '../../services/platformService';
import authService from '../../services/authService';
import './CampaignForm.css';

const CampaignForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [formData, setFormData] = useState({
        name: '',
        platform: '',
        objective: 'TRAFFIC',
        budget: { amount: 0, type: 'DAILY' },
        start_date: new Date().toISOString().split('T')[0],
        currency: 'USD',
        status: 'DRAFT',
        platform_account_id: '',
        ad_groups: [
            {
                name: 'Default Ad Group',
                creatives: [
                    {
                        name: 'Text Creative 1',
                        headlines: [{ text: '' }],
                        descriptions: [{ text: '' }]
                    }
                ]
            }
        ]
    });

    const [loading, setLoading] = useState(false);
    const [connectedPlatforms, setConnectedPlatforms] = useState([]);
    const [platformsLoading, setPlatformsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});

    // Fetch connected platforms on mount
    useEffect(() => {
        const fetchConnectedPlatforms = async () => {
            try {
                setPlatformsLoading(true);
                const platforms = await platformService.getConnectedPlatforms();
                setConnectedPlatforms(platforms || []);

                // Auto-select first connected platform if creating new (not editing)
                if (!isEdit && platforms && platforms.length > 0) {
                    setFormData(prev => ({
                        ...prev,
                        platform: platforms[0].platform,
                        platform_account_id: platforms[0].platform_account_id
                    }));
                }
            } catch (err) {
                console.error('Failed to fetch connected platforms', err);
                setConnectedPlatforms([]);
            } finally {
                setPlatformsLoading(false);
            }
        };
        fetchConnectedPlatforms();
    }, []);

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
                        data.ad_groups = [{ name: '', creatives: [{ name: '', headlines: [{ text: '' }], descriptions: [{ text: '' }] }] }];
                    }
                    setFormData(data);
                    // Stop polling once status is no longer PUBLISHING
                    if (data.status !== 'PUBLISHING') {
                        clearInterval(pollInterval);
                    }
                } catch (err) {
                    // Don't show error during background polling to avoid confusing UI
                    console.error('Poll failed:', err);
                }
            }, 5000);
        }
        return () => clearInterval(pollInterval);
    }, [formData.status]);

    const loadDraft = async () => {
        try {
            setLoading(true);
            const response = await campaignService.getDraft(id);
            const data = response.data;
            if (data.start_date) {
                data.start_date = new Date(data.start_date).toISOString().split('T')[0];
            }
            // Ensure UI-friendly structure if missing children
            if (!data.ad_groups || data.ad_groups.length === 0) {
                data.ad_groups = [{ name: '', creatives: [{ name: '', headlines: [{ text: '' }], descriptions: [{ text: '' }] }] }];
            }
            setFormData(data);
        } catch (err) {
            setError('Failed to load draft details.');
        } finally {
            setLoading(false);
        }
    };

    // --- Validation ---
    const validateForm = () => {
        const errors = {};

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
        setFormData(prev => ({
            ...prev,
            platform: selectedPlatform,
            platform_account_id: platformData ? platformData.platform_account_id : ''
        }));
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
            ad_groups: [...prev.ad_groups, { name: '', creatives: [{ name: '', headlines: [{ text: '' }], descriptions: [{ text: '' }] }] }]
        }));
    };

    const handleCreativeChange = (agIndex, cIndex, field, value, itemIndex) => {
        const newAdGroups = [...formData.ad_groups];
        const creative = { ...newAdGroups[agIndex].creatives[cIndex] };

        if (field === 'headlines' || field === 'descriptions') {
            const newList = [...creative[field]];
            newList[itemIndex] = { ...newList[itemIndex], text: value };
            creative[field] = newList;
        } else {
            creative[field] = value;
        }

        newAdGroups[agIndex].creatives[cIndex] = creative;
        setFormData(prev => ({ ...prev, ad_groups: newAdGroups }));
    };

    const addTextField = (agIndex, cIndex, field) => {
        const newAdGroups = [...formData.ad_groups];
        const creative = { ...newAdGroups[agIndex].creatives[cIndex] };
        creative[field] = [...creative[field], { text: '' }];
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

    // --- Helpers ---
    const getSelectedPlatformLabel = () => {
        const found = connectedPlatforms.find(p => p.platform === formData.platform);
        return found ? found.label : '';
    };

    const noPlatformsConnected = !platformsLoading && connectedPlatforms.length === 0;

    if (loading && isEdit && !formData.name) return <div className="loading-state">Loading draft...</div>;

    return (
        <div className="form-container">
            <div className="form-header">
                <div className="title-section">
                    <h1>{isEdit ? 'Edit Campaign Draft' : 'Create New Campaign'}</h1>
                    {isEdit && (
                        <div className={`status-badge status-${formData.status.toLowerCase()}`}>
                            {formData.status}
                        </div>
                    )}
                    {isEdit && formData.created_by && (
                        <span className="creator-badge">
                            Created by: {formData.created_by.name} ({formData.created_by.email})
                        </span>
                    )}
                </div>
                {isEdit && authService.getCurrentUser()?.role === 'ADMIN' && (
                    <button type="button" onClick={handleDelete} disabled={loading} className="btn-delete">
                        Delete Campaign
                    </button>
                )}
            </div>

            <form className="campaign-form">
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}
                {formData.status === 'FAILED' && formData.failure_reason && (
                    <div className="failure-banner">
                        <strong>Publish Failed:</strong> {formData.failure_reason}
                    </div>
                )}

                {/* No platforms connected warning */}
                {noPlatformsConnected && (
                    <div className="no-platforms-warning">
                        <div className="warning-icon">⚠️</div>
                        <div className="warning-content">
                            <strong>No Platforms Connected</strong>
                            <p>You need to connect at least one advertising platform before creating a campaign.</p>
                            <button type="button" className="btn-connect-link" onClick={() => navigate('/platforms')}>
                                Go to Platforms →
                            </button>
                        </div>
                    </div>
                )}

                <section className="form-section">
                    <h2>1. Campaign Details</h2>
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

                <section className="form-section">
                    <div className="section-header">
                        <h2>2. Ad Groups & Creatives</h2>
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
                                        <button type="button" onClick={() => addTextField(agIndex, cIndex, 'headlines')} className="btn-text-only">+ Add Headline</button>
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
                                        <button type="button" onClick={() => addTextField(agIndex, cIndex, 'descriptions')} className="btn-text-only">+ Add Description</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </section>

                <div className="btn-group-footer">
                    <button type="button" onClick={() => navigate('/drafts')} className="btn-cancel">Cancel</button>
                    <div className="save-actions">
                        {formData.status === 'READY' && (authService.getCurrentUser()?.role === 'ADMIN' || authService.getCurrentUser()?.role === 'CLIENT') && (
                            <button type="button" onClick={handlePublish} disabled={loading} className="btn-publish">
                                {loading ? 'Starting...' : 'Publish to Platform'}
                            </button>
                        )}
                        {(formData.status === 'DRAFT' || formData.status === 'READY' || formData.status === 'FAILED') && (
                            <>
                                <button type="button" onClick={(e) => handleSubmit(e, 'DRAFT')} disabled={loading || noPlatformsConnected} className="btn-save-draft">
                                    Save as Draft
                                </button>
                                <button type="button" onClick={(e) => handleSubmit(e, 'READY')} disabled={loading || noPlatformsConnected} className="btn-set-ready">
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
