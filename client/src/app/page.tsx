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

    const allPreferences = ['🎵 Музыка', '🎬 Фильмы', '🎨 Искусство', '🎮 Игры', '🏃 Спорт', '🌍 Путешествия', '🍲 Еда', '📚 Книги', '🎤 Караоке', '🛍️ Шоппинг', '🎢 Аттракционы', '🎳 Боулинг'];
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
        } catch (error:any) {
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

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#e0f7fa] bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url('/bg-almaty.png')` }}>
            <header className="flex items-center justify-between w-full p-4 bg-[#C5DF93] fixed top-0 z-10 sm:static sm:justify-end sm:w-[60%] sm:rounded-[30px] sm:mt-6 sm:p-4">
                <div className="text-white text-lg sm:hidden">seruen</div>
                <div className="hidden sm:block font-semibold text-white text-4xl sm:pr-[350px]">seruen</div>
                <img src="/profile.svg" alt="profile" className="w-8 h-8" />
            </header>
            <main className="flex flex-col items-center flex-1 w-full pt-24 sm:pt-[100px] px-4">
                <h1 className="w-full sm:w-[60%] text-2xl sm:text-4xl font-black text-center text-[#E79A86] mb-4">Узнайте о лучших событиях в вашем городе!</h1>
                <h2 className="w-full sm:w-[60%] text-base sm:text-2xl font-medium text-center text-[#9A9A9A] pb-7">Введите свои данные, чтобы получать персонализированные рекомендации и не пропустить ни одного интересного мероприятия.</h2>
                <form className="w-full sm:w-[60%] space-y-4" onSubmit={handleSubmit}>
                    {currentStep === 0 && (
                        <div className="w-full flex flex-col space-y-2">
                            <label className="block text-sm sm:text-md text-[#9A9A9A] text-opacity-80">Введите свой юзернейм в телеграме</label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Input
                                    type="text"
                                    placeholder="@username"
                                    className="flex-1 h-12 sm:h-16 text-sm sm:text-lg text-black bg-white bg-opacity-75 rounded-full border-[#C5DF93] border-2 focus:border-[#9A9A9A] focus:border-3 focus:outline-none"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="h-12 sm:h-16 w-full sm:w-auto bg-[#C5DF93] text-white rounded-lg mt-2 sm:mt-0 sm:px-6 flex justify-center items-center"
                                >
                                    <img src="/arrow.svg" alt="next" className="w-6 sm:w-[50px] h-6 sm:h-[60px]" />
                                </button>
                            </div>
                        </div>
                    )}
                    {currentStep === 1 && (
                        <div className="w-full flex flex-col space-y-2">
                            <label className="block text-sm sm:text-md text-[#9A9A9A]">Введите бюджет (в тенге) который Вы готовы потратить на свой досуг</label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <select
                                    className="flex-1 h-12 sm:h-16 text-sm sm:text-lg text-black bg-white bg-opacity-75 rounded-full border-[#C5DF93] border-2 focus:border-[#9A9A9A] focus:border-3 focus:outline-none"
                                    value={budget}
                                    onChange={(e) => setBudget(e.target.value)}
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
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="h-12 sm:h-16 w-full sm:w-auto bg-[#C5DF93] text-white rounded-lg mt-2 sm:mt-0 sm:px-6 flex justify-center items-center"
                                >
                                    <img src="/arrow.svg" alt="next" className="w-6 sm:w-[50px] h-6 sm:h-[70px]" />
                                </button>
                            </div>
                        </div>
                    )}
                    {currentStep === 2 && (
                        <div className="w-full flex flex-col space-y-2 relative">
                            <label className="block text-sm sm:text-md text-[#9A9A9A]">Какие у Вас предпочтения?</label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Input
                                    type="text"
                                    placeholder="Выберите предпочтения"
                                    className="h-12 sm:h-16 text-sm sm:text-lg text-black bg-white bg-opacity-75 rounded-full border-[#C5DF93] border-2 focus:border-[#9A9A9A] focus:border-3 focus:outline-none"
                                    value={preferences.join(', ')}
                                    readOnly
                                    onClick={() => setShowDropdown(!showDropdown)}
                                />
                                <button
                                    type="submit"
                                    className="h-12 sm:h-16 w-full sm:w-auto bg-[#C5DF93] text-white rounded-lg mt-2 sm:mt-0 sm:px-6 flex justify-center items-center"
                                >
                                    <img src="/arrow.svg" alt="next" className="w-6 sm:w-[50px] h-6 sm:h-[70px]" />
                                </button>
                            </div>
                            {showDropdown && (
                                <div
                                    ref={dropdownRef}
                                    className={`absolute w-full bg-white shadow-lg rounded-lg z-10 top-full mt-2'}`}
                                >
                                    <div className="flex flex-wrap gap-2 p-2">
                                        {allPreferences.map(preference => (
                                            <div
                                                key={preference}
                                                className={`cursor-pointer px-4 py-2 rounded-full ${preferences.includes(preference.split(' ')[1]) ? 'bg-[#C5DF93] text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                                                onClick={() => handlePreferencesChange(preference)}
                                            >
                                                {preference}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </form>
                <ToastContainer autoClose={3000} />
                {currentStep !== 0 && (
                    <div className="text-[#9A9A9A] pt-6 text-opacity-80 text-sm underline cursor-pointer text-left"
                         onClick={() => setCurrentStep(currentStep - 1)}
                    >Вернуться назад</div>
                )}
            </main>
        </div>
    );
}
