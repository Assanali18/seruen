'use client'
import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPreferencesDTO } from "@/lib/types";
import {axiosInstance} from "@/axios/axiosInstance";

export default function Home() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [budget, setBudget] = useState('');
    const [preferences, setPreferences] = useState('');
    const [availableDays, setAvailableDays] = useState('');

    const handleSubmit = async (e:any) => {
        e.preventDefault();

        const userPreferences: UserPreferencesDTO = {
            userName: name,
            email,
            phone,
            spendingLimit: parseInt(budget),
            hobbies: preferences.split(',').map(pref => pref.trim()),
            schedule: availableDays.split(',').map(day => day.trim())
        };

        try {
            const response = await axiosInstance.post('/api/users/', userPreferences);

            if (response.status === 201) {
                window.location.href = 'https://t.me/EventEaseBot';
            } else {
                console.error('Error fetching recommendations:', response.statusText);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#e0f7fa]">
            <header className="flex items-center justify-between w-full max-w-4xl p-4">
                <div className="text-3xl font-bold text-[#f39c12]">seruen</div>
            </header>
            <main className="relative flex flex-col items-center justify-center flex-1 w-full p-4 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url('/almaty.png')` }}>
                <h1 className="mb-8 text-2xl font-light text-center text-[#f39c12] z-10">Lets get to know each other</h1>
                <form className="relative flex flex-col items-center w-full max-w-md z-10 space-y-4" onSubmit={handleSubmit}>
                    <Input type="text" placeholder="Name" className="w-full px-4 py-2 text-lg text-black bg-white bg-opacity-75 border rounded-full" value={name} onChange={(e) => setName(e.target.value)} />
                    <Input type="email" placeholder="Email" className="w-full px-4 py-2 text-lg text-black bg-white bg-opacity-75 border rounded-full" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <Input type="tel" placeholder="Phone Number" className="w-full px-4 py-2 text-lg text-black bg-white bg-opacity-75 border rounded-full" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    <Input type="number" placeholder="Budget (in $)" className="w-full px-4 py-2 text-lg text-black bg-white bg-opacity-75 border rounded-full" value={budget} onChange={(e) => setBudget(e.target.value)} />
                    <textarea placeholder="Preferences (comma separated)" className="w-full px-4 py-2 text-lg text-black bg-white bg-opacity-75 border rounded-lg" rows={4} value={preferences} onChange={(e) => setPreferences(e.target.value)}></textarea>
                    <textarea placeholder="Available Days (comma separated)" className="w-full px-4 py-2 text-lg text-black bg-white bg-opacity-75 border rounded-lg" rows={4} value={availableDays} onChange={(e) => setAvailableDays(e.target.value)}></textarea>
                    <Button type="submit" className="relative z-10 px-6 py-3 mt-6 text-white bg-[#8e44ad] rounded-full">
                        Submit
                    </Button>
                </form>
            </main>
        </div>
    );
}
