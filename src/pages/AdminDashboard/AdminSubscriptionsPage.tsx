import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    Edit2,
    Trash2,
    Star,
    DollarSign,
    Calendar,
    Check,
    X,
    Eye,
    EyeOff,
    Save,
    ArrowUp,
    ArrowDown,
    ArrowLeft
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import Button from '../../components/Button';
import { subscriptionsService } from '../../services/subscriptions';
import { showToast } from '../../store/uiSlice';

interface Feature {
    planId?: string;
    featureKey: string;
    value: string;
    isEnabled?: boolean;
    id?: string;
    isDeleted?: boolean;
}

interface SubscriptionPlan {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    billingCycle: 'Monthly' | 'Yearly' | 'Quarterly' | 'Free';
    features: Feature[] | Record<string, string>; // Support both formats
    isActive: boolean;
    displayOrder: number;
    trialDays: number;
    isMostPopular: boolean;
    marketingTagline?: string;
}

const AdminSubscriptionsPage: React.FC = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
    const [showFeatureModal, setShowFeatureModal] = useState(false);
    const [selectedPlanForFeatures, setSelectedPlanForFeatures] = useState<SubscriptionPlan | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: 0,
        currency: 'USD',
        billingCycle: 'Monthly' as 'Monthly' | 'Yearly' | 'Quarterly' | 'Free',
        features: {} as Record<string, string>,
        isActive: true,
        displayOrder: 0,
        trialDays: 0,
        isMostPopular: false,
        marketingTagline: ''
    });

    // Feature form state
    const [featureKey, setFeatureKey] = useState('');
    const [featureValue, setFeatureValue] = useState('');

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const response = await subscriptionsService.getPlans();
            const plansData = (response as any)?.data || response || [];
            setPlans(Array.isArray(plansData) ? plansData : []);
        } catch (error: any) {
            console.error('Failed to fetch plans:', error);
            dispatch(showToast({ message: 'Failed to load subscription plans', type: 'error' }));
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (plan?: SubscriptionPlan) => {
        if (plan) {
            setEditingPlan(plan);
            // Convert features array to Record if needed
            const featuresObj = Array.isArray(plan.features)
                ? plan.features.reduce((acc, f) => ({ ...acc, [f.featureKey]: f.value }), {})
                : (plan.features || {});

            setFormData({
                name: plan.name,
                description: plan.description,
                price: plan.price,
                currency: plan.currency,
                billingCycle: plan.billingCycle,
                features: featuresObj,
                isActive: plan.isActive,
                displayOrder: plan.displayOrder,
                trialDays: plan.trialDays,
                isMostPopular: plan.isMostPopular,
                marketingTagline: plan.marketingTagline || ''
            });
        } else {
            setEditingPlan(null);
            setFormData({
                name: '',
                description: '',
                price: 0,
                currency: 'USD',
                billingCycle: 'Monthly',
                features: {},
                isActive: true,
                displayOrder: plans.length,
                trialDays: 0,
                isMostPopular: false,
                marketingTagline: ''
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingPlan(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);

            // Prepare data - remove empty features object if no features
            const submitData = {
                ...formData,
                features: Object.keys(formData.features).length > 0 ? formData.features : undefined
            };

            console.log('=== SUBMITTING PLAN DATA ===');
            console.log('Full submitData:', JSON.stringify(submitData, null, 2));
            console.log('Is editing?', !!editingPlan);

            if (editingPlan) {
                await subscriptionsService.updatePlan(editingPlan.id, submitData);
                dispatch(showToast({ message: 'Plan updated successfully', type: 'success' }));
            } else {
                await subscriptionsService.createPlan(submitData);
                dispatch(showToast({ message: 'Plan created successfully', type: 'success' }));
            }

            handleCloseModal();
            fetchPlans();
        } catch (error: any) {
            console.error('=== PLAN SUBMISSION ERROR ===');
            console.error('Full error object:', JSON.stringify(error, null, 2));
            console.error('Error response:', error?.response);
            console.error('Error response data (stringified):', JSON.stringify(error?.response?.data, null, 2));
            console.error('Error status:', error?.response?.status);
            console.error('Error statusText:', error?.response?.statusText);

            // Extract error message from various possible formats
            let errorMsg = 'Failed to save plan';
            if (error?.response?.data?.messages && Array.isArray(error.response.data.messages) && error.response.data.messages.length > 0) {
                errorMsg = error.response.data.messages.join(', ');
            } else if (error?.response?.data?.message) {
                errorMsg = error.response.data.message;
            } else if (error?.response?.data?.title) {
                errorMsg = error.response.data.title;
            }

            dispatch(showToast({ message: errorMsg, type: 'error' }));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeletePlan = async (planId: string, planName: string) => {
        if (!window.confirm(`Are you sure you want to delete "${planName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await subscriptionsService.deletePlan(planId);
            dispatch(showToast({ message: 'Plan deleted successfully', type: 'success' }));
            fetchPlans();
        } catch (error: any) {
            const errorMsg = error?.response?.data?.message || 'Failed to delete plan';
            dispatch(showToast({ message: errorMsg, type: 'error' }));
        }
    };

    const handleToggleActive = async (plan: SubscriptionPlan) => {
        try {
            await subscriptionsService.updatePlan(plan.id, { isActive: !plan.isActive });
            dispatch(showToast({ message: `Plan ${!plan.isActive ? 'activated' : 'deactivated'}`, type: 'success' }));
            fetchPlans();
        } catch (error: any) {
            dispatch(showToast({ message: 'Failed to update plan status', type: 'error' }));
        }
    };

    const handleToggleMostPopular = async (plan: SubscriptionPlan) => {
        try {
            await subscriptionsService.updatePlan(plan.id, { isMostPopular: !plan.isMostPopular });
            dispatch(showToast({ message: 'Most popular status updated', type: 'success' }));
            fetchPlans();
        } catch (error: any) {
            dispatch(showToast({ message: 'Failed to update most popular status', type: 'error' }));
        }
    };

    const handleOpenFeatureModal = (plan: SubscriptionPlan) => {
        setSelectedPlanForFeatures(plan);
        setShowFeatureModal(true);
        setFeatureKey('');
        setFeatureValue('');
    };

    const handleAddFeature = async () => {
        if (!selectedPlanForFeatures || !featureKey || !featureValue) {
            dispatch(showToast({ message: 'Please enter both feature key and value', type: 'error' }));
            return;
        }

        try {
            await subscriptionsService.addFeature(selectedPlanForFeatures.id, {
                featureKey,
                value: featureValue
            });
            dispatch(showToast({ message: 'Feature added successfully', type: 'success' }));
            setFeatureKey('');
            setFeatureValue('');
            fetchPlans();
        } catch (error: any) {
            const errorMsg = error?.response?.data?.message || 'Failed to add feature';
            dispatch(showToast({ message: errorMsg, type: 'error' }));
        }
    };

    const handleDeleteFeature = async (planId: string, featureKey: string) => {
        if (!window.confirm(`Delete feature "${featureKey}"?`)) return;

        try {
            await subscriptionsService.deleteFeature(planId, featureKey);
            dispatch(showToast({ message: 'Feature deleted successfully', type: 'success' }));
            fetchPlans();
        } catch (error: any) {
            dispatch(showToast({ message: 'Failed to delete feature', type: 'error' }));
        }
    };

    const handleUpdateDisplayOrder = async (planId: string, direction: 'up' | 'down') => {
        const plan = plans.find(p => p.id === planId);
        if (!plan) return;

        const newOrder = direction === 'up' ? plan.displayOrder - 1 : plan.displayOrder + 1;

        try {
            await subscriptionsService.updatePlan(planId, { displayOrder: newOrder });
            fetchPlans();
        } catch (error: any) {
            dispatch(showToast({ message: 'Failed to update display order', type: 'error' }));
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <p className="text-slate-600 dark:text-slate-400">Loading subscription plans...</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subscription Plans</h1>
                            <p className="text-slate-600 dark:text-slate-400 mt-1">Manage subscription plans and features</p>
                        </div>
                    </div>
                    <Button onClick={() => handleOpenModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Plus size={20} className="mr-2" />
                        Create Plan
                    </Button>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`bg-white dark:bg-slate-800 rounded-xl border-2 transition-all ${plan.isMostPopular
                                ? 'border-indigo-500 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20'
                                : 'border-slate-200 dark:border-slate-700'
                                } ${!plan.isActive ? 'opacity-60' : ''}`}
                        >
                            <div className="p-6">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                                            {plan.isMostPopular && (
                                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs font-semibold rounded-full">
                                                    Popular
                                                </span>
                                            )}
                                        </div>
                                        {plan.marketingTagline && (
                                            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">{plan.marketingTagline}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleUpdateDisplayOrder(plan.id, 'up')}
                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                                            title="Move up"
                                        >
                                            <ArrowUp size={16} className="text-slate-500" />
                                        </button>
                                        <button
                                            onClick={() => handleUpdateDisplayOrder(plan.id, 'down')}
                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                                            title="Move down"
                                        >
                                            <ArrowDown size={16} className="text-slate-500" />
                                        </button>
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="mb-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-bold text-slate-900 dark:text-white">
                                            {plan.currency === 'USD' ? '$' : plan.currency}
                                            {plan.price}
                                        </span>
                                        <span className="text-slate-500 dark:text-slate-400">/{plan.billingCycle.toLowerCase()}</span>
                                    </div>
                                    {plan.trialDays > 0 && (
                                        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                                            {plan.trialDays} days free trial
                                        </p>
                                    )}
                                </div>

                                {/* Description */}
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{plan.description}</p>

                                {/* Features */}
                                <div className="mb-4">
                                    <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2">Features</h4>
                                    <div className="space-y-1">
                                        {(() => {
                                            // Handle both array and object formats
                                            const featuresArray = Array.isArray(plan.features)
                                                ? plan.features
                                                : Object.entries(plan.features || {}).map(([key, value]) => ({
                                                    featureKey: key,
                                                    value: typeof value === 'string' ? value : String(value)
                                                }));

                                            return featuresArray.slice(0, 3).map((feature, idx) => (
                                                <div key={feature.featureKey || idx} className="flex items-start gap-2 text-sm">
                                                    <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                                                    <span className="text-slate-700 dark:text-slate-300">{feature.value}</span>
                                                </div>
                                            ));
                                        })()}
                                        {(() => {
                                            const featuresCount = Array.isArray(plan.features)
                                                ? plan.features.length
                                                : Object.keys(plan.features || {}).length;

                                            return featuresCount > 3 && (
                                                <button
                                                    onClick={() => handleOpenFeatureModal(plan)}
                                                    className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                                                >
                                                    +{featuresCount - 3} more features
                                                </button>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="flex items-center gap-2 mb-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${plan.isActive
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                        }`}>
                                        {plan.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    <span className="text-xs text-slate-500">Order: {plan.displayOrder}</span>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <button
                                        onClick={() => handleOpenModal(plan)}
                                        className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/30 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Edit2 size={16} />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleOpenFeatureModal(plan)}
                                        className="flex-1 px-3 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Features
                                    </button>
                                    <button
                                        onClick={() => handleToggleActive(plan)}
                                        className="px-3 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 rounded-lg transition-colors"
                                        title={plan.isActive ? 'Deactivate' : 'Activate'}
                                    >
                                        {plan.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                    <button
                                        onClick={() => handleToggleMostPopular(plan)}
                                        className={`px-3 py-2 rounded-lg transition-colors ${plan.isMostPopular
                                            ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400'
                                            : 'bg-slate-50 text-slate-400 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600'
                                            }`}
                                        title="Toggle Most Popular"
                                    >
                                        <Star size={16} fill={plan.isMostPopular ? 'currentColor' : 'none'} />
                                    </button>
                                    <button
                                        onClick={() => handleDeletePlan(plan.id, plan.name)}
                                        className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {plans.length === 0 && (
                    <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl">
                        <DollarSign size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No subscription plans</h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">Create your first subscription plan to get started</p>
                        <Button onClick={() => handleOpenModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Plus size={20} className="mr-2" />
                            Create Plan
                        </Button>
                    </div>
                )}
            </div>

            {/* Create/Edit Plan Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                                {editingPlan ? 'Edit Plan' : 'Create New Plan'}
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Plan Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                            required
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Description *
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                            rows={3}
                                            required
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Marketing Tagline
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.marketingTagline}
                                            onChange={(e) => setFormData({ ...formData, marketingTagline: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                            placeholder="e.g., Best Value, Most Popular"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Price *
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.price || 0}
                                            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Currency *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.currency}
                                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                            placeholder="USD"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Billing Cycle *
                                        </label>
                                        <select
                                            value={formData.billingCycle}
                                            onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value as any })}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                            required
                                        >
                                            <option value="Monthly">Monthly</option>
                                            <option value="Yearly">Yearly</option>
                                            <option value="Quarterly">Quarterly</option>
                                            <option value="Free">Free</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Trial Days
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.trialDays || 0}
                                            onChange={(e) => setFormData({ ...formData, trialDays: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Display Order
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.displayOrder || 0}
                                            onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                        />
                                    </div>

                                    <div className="col-span-2 flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.isActive}
                                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                            />
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Active</span>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.isMostPopular}
                                                onChange={(e) => setFormData({ ...formData, isMostPopular: e.target.checked })}
                                                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                            />
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Most Popular</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleCloseModal}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                                    >
                                        {submitting ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Feature Management Modal */}
            {showFeatureModal && selectedPlanForFeatures && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                Manage Features
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 mb-6">{selectedPlanForFeatures.name}</p>

                            {/* Add Feature Form */}
                            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mb-6">
                                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Add New Feature</h3>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Feature Key (e.g., max_users)"
                                        value={featureKey}
                                        onChange={(e) => setFeatureKey(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Value (e.g., Unlimited users)"
                                        value={featureValue}
                                        onChange={(e) => setFeatureValue(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                                    />
                                    <Button onClick={handleAddFeature} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                        <Plus size={16} />
                                    </Button>
                                </div>
                            </div>

                            {/* Features List */}
                            <div className="space-y-2 mb-6">
                                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Current Features</h3>
                                {(() => {
                                    // Handle both array and object formats
                                    const featuresArray = Array.isArray(selectedPlanForFeatures.features)
                                        ? selectedPlanForFeatures.features
                                        : Object.entries(selectedPlanForFeatures.features || {}).map(([key, value]) => ({
                                            featureKey: key,
                                            value: typeof value === 'string' ? value : String(value)
                                        }));

                                    return featuresArray.length > 0 ? (
                                        featuresArray.map((feature, idx) => (
                                            <div
                                                key={feature.featureKey || idx}
                                                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                                            >
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-slate-900 dark:text-white">{feature.featureKey}</p>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400">{feature.value}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteFeature(selectedPlanForFeatures.id, feature.featureKey)}
                                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-slate-500 py-4">No features added yet</p>
                                    );
                                })()}
                            </div>

                            <Button
                                onClick={() => setShowFeatureModal(false)}
                                className="w-full bg-slate-600 hover:bg-slate-700 text-white"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminSubscriptionsPage;
