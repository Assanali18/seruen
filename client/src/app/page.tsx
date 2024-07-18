'use client'
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { UserPreferencesDTO } from "@/lib/types";
import { axiosInstance } from "@/axios/axiosInstance";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

export default function Home() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [budget, setBudget] = useState('');
    const [preferences, setPreferences] = useState<string[]>([]);
    const [availableDays, setAvailableDays] = useState('');
    const [currentStep, setCurrentStep] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [customPreference, setCustomPreference] = useState('');
    const customPreferenceRef = useRef<HTMLInputElement>(null);

    const allPreferences = ['🎵 Музыка', '🎨 Искусство', '🏃 Спорт', '🌍 Путешествия', '🍲 Еда', '🎭 Театр', '🎤 Комедия', '🎉 Фестиваль', '🛠️ Развитие'];
    const allPreferencesNames = allPreferences.map(p => p.split(' ')[1]);


    const handleNext = () => {
        if ((currentStep === 0 && !name) ||
            (currentStep === 1 && !budget) ||
            (currentStep === 2 && preferences.length === 0)) {
            toast.error('Пожалуйста заполните поле');
        } else {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevious = () => {
        setCurrentStep(currentStep - 1);
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();

        if (!name || !budget || preferences.length === 0) {
            toast.error('Пожалуйста заполните все поля');
            return;
        }

        const userPreferences: UserPreferencesDTO = {
            userName: name.startsWith('@') ? name.slice(1) : name,
            email,
            phone,
            spendingLimit: parseInt(budget),
            hobbies: preferences,
            schedule: availableDays.split(',').map(day => day.trim())
        };

        try {
            console.log('userPreferences:', userPreferences)
            const response = await axiosInstance.post('/api/users/', userPreferences);

            if (response.status === 201) {
                if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                    window.location.assign('tg://resolve?domain=EventEaseBot');
                } else {
                    window.location.assign('https://t.me/EventEaseBot');
                }
                toast.success('Спасибо за регистрацию! Пожалуйста, напишите боту в телеграме');
            } else {
                console.error('Error fetching recommendations:', response.statusText);
                toast.error(`Error: ${response.statusText}`);
            }
        } catch (error: any) {
            console.error('Network Error:', error);
            toast.error(`Network Error: ${error.message}`);
        }
    };

    const handlePreferencesChange = (preference: string) => {
        const preferenceName = preference.split(' ')[1];
        setPreferences(prev =>
            prev.includes(preferenceName) ? prev.filter(p => p !== preferenceName) : [...prev, preferenceName]
        );
    };

    const handleCustomPreferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomPreference(e.target.value);
    };

    const handleCustomPreferenceAdd = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && customPreference.trim()) {
            e.preventDefault();
            setPreferences(prev => [...prev, customPreference.trim()]);
            setCustomPreference('');
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setCustomPreference('');
            if (customPreferenceRef.current) {
                customPreferenceRef.current.blur();
            }
        }
    };

    const handleRemovePreference = (e: React.MouseEvent<HTMLButtonElement>, preference: string) => {
        e.stopPropagation(); // Остановим всплытие события, чтобы не было конфликтов
        setPreferences(prev => prev.filter(p => p !== preference));
    };

    const handleEnterKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleNext();
        }
    };

    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownRef]);

    const getCyclistPosition = () => {
        if (typeof window !== 'undefined') {
            return (currentStep / 1.15) * (window.innerWidth / 2);
        }
        return 0;
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#e0f7fa] bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/bg-almaty.png)' }}>
            <header className="flex items-center justify-start sm:justify-center w-full p-4 bg-[#C5DF93] fixed top-0 z-10 sm:static sm:w-[60%] sm:rounded-[30px] sm:mt-6 sm:p-4">
                <div className="text-white text-lg sm:hidden">seruen</div>
                <div className="hidden sm:block font-semibold text-white text-4xl">seruen</div>
            </header>
            <main className="flex flex-col items-center flex-1 w-full pt-24 sm:pt-[100px] px-4">
                <h1 className="w-full sm:w-[60%] text-2xl sm:text-4xl font-black text-center text-[#E79A86] mb-4">Лучшие события в вашем городе!</h1>
                <h2 className="w-full sm:w-[60%] text-base sm:text-2xl font-medium text-center text-[#9A9A9A] pb-7">Введите свои данные, чтобы получать персональные рекомендации и не пропустить интересные мероприятия.</h2>
                <form className="w-full sm:w-[60%] space-y-4" onSubmit={handleSubmit}>
                    {currentStep === 0 && (
                        <div className="w-full flex flex-col space-y-2" onKeyDown={handleEnterKey}>
                            <label className="block text-sm sm:text-md text-[#9A9A9A] text-opacity-80">Юзернейм в Telegram</label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <div className="relative flex items-center w-full">
                                    <span className="absolute left-4 text-sm sm:text-lg text-[#9A9A9A]">https://t.me/</span>
                                    <input
                                        type="text"
                                        name="floating_username"
                                        id="floating_username"
                                        className="block py-2.5 pr-4 w-full h-12 sm:h-16 text-sm sm:text-lg text-black bg-white bg-opacity-75 rounded-full border-[#C5DF93] border-2 focus:outline-none focus:ring-0 focus:border-[#C5DF93] peer"
                                        style={{ paddingLeft: 'calc(7.5em)' }}
                                        placeholder=" "
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                    <label
                                        htmlFor="floating_username"
                                        className="peer-focus:font-medium absolute text-sm sm:text-md text-[#9A9A9A] duration-300 transform -translate-y-6 scale-75 top-3 left-28 -z-10 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 peer-focus:text-[#C5DF93]"
                                    >
                                        Юзернейм в Telegram
                                    </label>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="h-12 sm:h-16 w-full sm:w-auto bg-[#C5DF93] text-white rounded-lg mt-2 sm:mt-0 sm:px-6 flex justify-center items-center transition-transform duration-300 transform hover:scale-105"
                                >
                                    <span className="sm:hidden">Далее</span>
                                    <img src="/arrow.svg" alt="next" className="hidden sm:block w-6 sm:w-[50px] h-6 sm:h-[60px]" />
                                </button>
                            </div>
                        </div>
                    )}
                    {currentStep === 1 && (
                        <div className="w-full flex flex-col space-y-2" onKeyDown={handleEnterKey}>
                            <label className="block text-sm sm:text-md text-[#9A9A9A]">Бюджет (тенге)</label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <div className="relative w-full">
                                    <select
                                        name="floating_budget"
                                        id="floating_budget"
                                        className="block py-2.5 px-4 w-full h-12 sm:h-16 text-sm sm:text-lg text-black bg-white bg-opacity-75 rounded-full border-[#C5DF93] border-2 focus:outline-none focus:ring-0 focus:border-[#C5DF93] peer"
                                        value={budget}
                                        onChange={(e) => setBudget(e.target.value)}
                                        required
                                    >
                                        <option className="text-[#9A9A9A]" value="">Выберите бюджет</option>
                                        <option value="5000">0 - 5000 тенге</option>
                                        <option value="10000">5000 - 10000 тенге</option>
                                        <option value="20000">10000 - 20000 тенге</option>
                                        <option value="30000">20000 - 30000 тенге</option>
                                        <option value="40000">30000 - 40000 тенге</option>
                                        <option value="50000">40000 - 50000 тенге</option>
                                        <option value="100000">50000+ тенге</option>
                                    </select>
                                    <label
                                        htmlFor="floating_budget"
                                        className="peer-focus:font-medium absolute text-sm sm:text-md text-[#9A9A9A] duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-4 peer-focus:text-[#C5DF93] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
                                    >
                                        Бюджет (тенге)
                                    </label>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="h-12 sm:h-16 w-full sm:w-auto bg-[#C5DF93] text-white rounded-lg mt-2 sm:mt-0 sm:px-6 flex justify-center items-center transition-transform duration-300 transform hover:scale-105"
                                >
                                    <span className="sm:hidden">Далее</span>
                                    <img src="/arrow.svg" alt="next" className="hidden sm:block w-6 sm:w-[50px] h-6 sm:h-[70px]" />
                                </button>
                            </div>
                        </div>
                    )}
                    {currentStep === 2 && (
                        <div className="w-full flex flex-col space-y-2 relative">
                            <label className="block text-sm sm:text-md text-[#9A9A9A]">Предпочтения</label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <div className="relative w-full">
                                    <input
                                        type="text"
                                        name="floating_preferences"
                                        id="floating_preferences"
                                        className="block py-2.5 px-4 w-full h-12 sm:h-16 text-sm sm:text-lg text-black bg-white bg-opacity-75 rounded-full border-[#C5DF93] border-2 focus:outline-none focus:ring-0 focus:border-[#C5DF93] peer"
                                        placeholder=" "
                                        value={preferences.join(', ')}
                                        readOnly
                                        onClick={() => setShowDropdown(!showDropdown)}
                                        required
                                    />
                                    <label
                                        htmlFor="floating_preferences"
                                        className="peer-focus:font-medium absolute text-sm sm:text-md text-[#9A9A9A] duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-4 peer-focus:text-[#C5DF93] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
                                    >
                                        Предпочтения
                                    </label>
                                    {showDropdown && (
                                        <div
                                            ref={dropdownRef}
                                            className="absolute w-full bg-white shadow-lg rounded-lg z-10 top-full mt-2"
                                        >
                                            <div className="flex flex-wrap gap-2 p-2">
                                                {allPreferences.map(preference => (
                                                    <div
                                                        key={preference}
                                                        className={`cursor-pointer px-4 py-2 rounded-full flex items-center justify-between ${preferences.includes(preference.split(' ')[1]) ? 'bg-[#C5DF93] text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                                                        onClick={() => handlePreferencesChange(preference)}
                                                    >
                                                        <span>{preference}</span>
                                                        {preferences.includes(preference.split(' ')[1]) && (
                                                            <button type="button" onClick={(e) => handleRemovePreference(e, preference.split(' ')[1])} className="ml-2 text-white">&times;</button>
                                                        )}
                                                    </div>
                                                ))}
                                                <input
                                                    type="text"
                                                    ref={customPreferenceRef}
                                                    className="block py-2 px-4 w-full text-sm text-black bg-white bg-opacity-75 rounded-full border-[#C5DF93] border-2 focus:outline-none focus:ring-0 focus:border-[#C5DF93] mt-2"
                                                    placeholder="Добавить свои предпочтения"
                                                    value={customPreference}
                                                    onChange={handleCustomPreferenceChange}
                                                    onKeyDown={handleCustomPreferenceAdd}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    className="h-12 sm:h-16 w-full sm:w-auto bg-[#C5DF93] text-white rounded-lg mt-2 sm:mt-0 sm:px-6 flex justify-center items-center transition-transform duration-300 transform hover:scale-105"
                                >
                                    <span className="sm:hidden">Далее</span>
                                    <img src="/arrow.svg" alt="submit" className="hidden sm:block w-6 sm:w-[50px] h-6 sm:h-[70px]" />
                                </button>
                            </div>
                        </div>
                    )}
                    {currentStep !== 0 && (
                        <div
                            onClick={handlePrevious}
                            className="sm:hidden h-12 w-full text-[#9A9A9A] mt-2 sm:mt-0 underline sm:px-6 flex justify-center items-center transition-colors duration-300 hover:text-[#C5DF93]"
                        >
                            Назад
                        </div>
                    )}
                </form>
                <ToastContainer autoClose={3000} />
                <div className="hidden sm:flex absolute bottom-7 w-full h-12 justify-between items-center">
                    <div className="relative w-full h-full flex justify-between items-center px-20">
                        <img src="/flag.png" alt="start flag" className="h-20" />
                        <img
                            src="/velo.png"
                            alt="cyclist"
                            className="absolute h-32 transition-transform duration-1000 pb-6"
                            style={{ transform: `translateX(${getCyclistPosition()}px)` }}
                        />
                        <img src="/flag.png" alt="end flag" className="h-20" />
                        <img src="/flag.png" alt="end flag" className="h-20" />
                    </div>
                </div>
                {currentStep !== 0 && (
                    <div className="absolute top-4 left-4 sm:static text-[#9A9A9A] pt-6 text-opacity-80 text-sm underline cursor-pointer text-left transition-colors duration-300 hover:text-[#C5DF93]"
                         onClick={handlePrevious}
                    >Назад</div>
                )}
            </main>
        </div>
    );
}
