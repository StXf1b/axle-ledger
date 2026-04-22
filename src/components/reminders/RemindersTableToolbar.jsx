"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import {
	REMINDER_STATUS_OPTIONS,
	REMINDER_TYPE_OPTIONS,
} from "@/lib/reminder-utils";

export default function RemindersTableToolbar({
	search,
	onSearchChange,
	status,
	onStatusChange,
	type,
	onTypeChange,
	timing,
	onTimingChange,
}) {
	return (
		<div className="reminders-toolbar">
			<div className="reminders-toolbar__left">
				<div className="reminders-search">
					<Search size={18} className="reminders-search__icon" />
					<input
						type="text"
						value={search}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Search plate, customer, title, reminder type..."
					/>
				</div>
			</div>

			<div className="reminders-toolbar__right">
				<div className="reminders-filter">
					<SlidersHorizontal size={16} />
					<select
						value={status}
						onChange={(e) => onStatusChange(e.target.value)}
					>
						<option value="All">All statuses</option>
						{REMINDER_STATUS_OPTIONS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</div>

				<div className="reminders-filter">
					<SlidersHorizontal size={16} />
					<select value={type} onChange={(e) => onTypeChange(e.target.value)}>
						<option value="All">All types</option>
						{REMINDER_TYPE_OPTIONS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</div>

				<div className="reminders-filter">
					<SlidersHorizontal size={16} />
					<select
						value={timing}
						onChange={(e) => onTimingChange(e.target.value)}
					>
						<option value="All">All timing</option>
						<option value="OVERDUE">Overdue</option>
						<option value="TODAY">Due today</option>
						<option value="SOON">Due soon</option>
						<option value="UPCOMING">Upcoming</option>
						<option value="COMPLETED">Completed</option>
					</select>
				</div>
			</div>
		</div>
	);
}
